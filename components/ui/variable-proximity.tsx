"use client";

import { motion } from "framer-motion";
import {
  type CSSProperties,
  type HTMLAttributes,
  type RefObject,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
} from "react";

type Falloff = "linear" | "exponential" | "gaussian";

type VariableProximityProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  fromFontVariationSettings: string;
  toFontVariationSettings: string;
  containerRef: RefObject<HTMLElement | null>;
  radius?: number;
  falloff?: Falloff;
  className?: string;
  style?: CSSProperties;
};

function useAnimationFrame(callback: () => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      callbackRef.current();
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, []);
}

function useMousePositionRef(containerRef: RefObject<HTMLElement | null>) {
  const positionRef = useRef({
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    const updatePosition = (x: number, y: number) => {
      if (!containerRef.current) {
        positionRef.current = { x, y };
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      positionRef.current = { x: x - rect.left, y: y - rect.top };
    };

    const handleMouseMove = (event: MouseEvent) => {
      updatePosition(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      updatePosition(touch.clientX, touch.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}

function parseFontVariationSettings(settings: string) {
  return new Map(
    settings
      .split(",")
      .map((setting) => setting.trim())
      .filter(Boolean)
      .map((setting) => {
        const [name, value] = setting.split(/\s+/);
        return [name.replace(/['"]/g, ""), Number.parseFloat(value)] as const;
      })
  );
}

function distanceBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getFalloff(distance: number, radius: number, falloff: Falloff) {
  const normalized = Math.min(Math.max(1 - distance / radius, 0), 1);

  if (falloff === "exponential") return normalized ** 2;
  if (falloff === "gaussian") {
    return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
  }

  return normalized;
}

export const VariableProximity = forwardRef<HTMLSpanElement, VariableProximityProps>(
  (
    {
      label,
      fromFontVariationSettings,
      toFontVariationSettings,
      containerRef,
      radius = 50,
      falloff = "linear",
      className = "",
      style,
      ...restProps
    },
    ref
  ) => {
    const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const mousePositionRef = useMousePositionRef(containerRef);
    const lastPositionRef = useRef<{ x: number | null; y: number | null }>({
      x: null,
      y: null,
    });

    const parsedSettings = useMemo(() => {
      const fromSettings = parseFontVariationSettings(fromFontVariationSettings);
      const toSettings = parseFontVariationSettings(toFontVariationSettings);

      return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
        axis,
        fromValue,
        toValue: toSettings.get(axis) ?? fromValue,
      }));
    }, [fromFontVariationSettings, toFontVariationSettings]);

    const baseFontWeight = parsedSettings.find(({ axis }) => axis === "wght")?.fromValue;

    useAnimationFrame(() => {
      if (!containerRef.current) return;

      const { x, y } = mousePositionRef.current;
      if (lastPositionRef.current.x === x && lastPositionRef.current.y === y) return;

      lastPositionRef.current = { x, y };
      const containerRect = containerRef.current.getBoundingClientRect();

      letterRefs.current.forEach((letterRef) => {
        if (!letterRef) return;

        const rect = letterRef.getBoundingClientRect();
        const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
        const letterCenterY = rect.top + rect.height / 2 - containerRect.top;
        const distance = distanceBetween(x, y, letterCenterX, letterCenterY);

        if (distance >= radius) {
          letterRef.style.fontVariationSettings = fromFontVariationSettings;
          if (baseFontWeight) letterRef.style.fontWeight = String(baseFontWeight);
          return;
        }

        const falloffValue = getFalloff(distance, radius, falloff);
        let nextFontWeight = baseFontWeight;
        const nextSettings = parsedSettings
          .map(({ axis, fromValue, toValue }) => {
            const interpolatedValue = fromValue + (toValue - fromValue) * falloffValue;
            if (axis === "wght") nextFontWeight = interpolatedValue;
            return `'${axis}' ${interpolatedValue}`;
          })
          .join(", ");

        letterRef.style.fontVariationSettings = nextSettings;
        if (nextFontWeight) letterRef.style.fontWeight = String(Math.round(nextFontWeight));
      });
    });

    const words = useMemo(() => {
      const splitWords = label.split(" ");

      return splitWords.map((word, wordIndex) => {
        const baseIndex = splitWords
          .slice(0, wordIndex)
          .reduce((total, previousWord) => total + previousWord.length, 0);

        return {
          word,
          wordIndex,
          letters: word.split("").map((letter, letterIndex) => ({
            letter,
            index: baseIndex + letterIndex,
          })),
        };
      });
    }, [label]);

    return (
      <span
        ref={ref}
        style={{
          display: "inline",
          fontVariationSettings: fromFontVariationSettings,
          ...(baseFontWeight ? { fontWeight: baseFontWeight } : null),
          ...style,
        }}
        className={className}
        {...restProps}
      >
        {words.map(({ word, wordIndex, letters }) => (
          <span key={`${word}-${wordIndex}`} className="inline-block whitespace-nowrap">
            {letters.map(({ letter, index }) => (
              <motion.span
                key={`${letter}-${index}`}
                ref={(element) => {
                  letterRefs.current[index] = element;
                }}
                style={{
                  display: "inline-block",
                  fontVariationSettings: fromFontVariationSettings,
                  ...(baseFontWeight ? { fontWeight: baseFontWeight } : null),
                }}
                aria-hidden="true"
              >
                {letter}
              </motion.span>
            ))}
            {wordIndex < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
          </span>
        ))}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
);

VariableProximity.displayName = "VariableProximity";
