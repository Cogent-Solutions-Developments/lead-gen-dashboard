"use client";

import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";

type EncryptedTextProps = {
  text: string;
  className?: string;
  revealDelayMs?: number;
  charset?: string;
  flipDelayMs?: number;
  encryptedClassName?: string;
  revealedClassName?: string;
  revealedContent?: ReactNode;
};

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

function randomCharacter(charset: string) {
  return charset.charAt(Math.floor(Math.random() * charset.length));
}

function gibberishWithSpaces(source: string, charset: string) {
  let result = "";
  for (let i = 0; i < source.length; i += 1) {
    result += source[i] === " " ? " " : randomCharacter(charset);
  }
  return result;
}

export function EncryptedText({
  text,
  className,
  revealDelayMs = 45,
  charset = DEFAULT_CHARSET,
  flipDelayMs = 45,
  encryptedClassName,
  revealedClassName,
  revealedContent,
}: EncryptedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const lastFlipRef = useRef(0);
  const scrambleRef = useRef<string[]>(
    gibberishWithSpaces(text, charset).split("")
  );

  const [revealCount, setRevealCount] = useState(0);
  const [scrambleChars, setScrambleChars] = useState<string[]>(
    gibberishWithSpaces(text, charset).split("")
  );

  useEffect(() => {
    if (!inView || !text) return;

    scrambleRef.current = gibberishWithSpaces(text, charset).split("");
    setScrambleChars([...scrambleRef.current]);
    startRef.current = performance.now();
    lastFlipRef.current = startRef.current;
    setRevealCount(0);

    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;

      const elapsed = now - startRef.current;
      const nextReveal = Math.min(text.length, Math.floor(elapsed / Math.max(1, revealDelayMs)));
      setRevealCount(nextReveal);

      if (nextReveal >= text.length) return;

      const sinceFlip = now - lastFlipRef.current;
      if (sinceFlip >= Math.max(0, flipDelayMs)) {
        for (let i = nextReveal; i < text.length; i += 1) {
          scrambleRef.current[i] = text[i] === " " ? " " : randomCharacter(charset);
        }
        setScrambleChars([...scrambleRef.current]);
        lastFlipRef.current = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, text, revealDelayMs, flipDelayMs, charset]);

  if (!text) return null;

  if (revealCount >= text.length && revealedContent) {
    return (
      <motion.span ref={ref} className={cn(className)} aria-label={text} role="text">
        {revealedContent}
      </motion.span>
    );
  }

  return (
    <motion.span ref={ref} className={cn(className)} aria-label={text} role="text">
      {text.split("").map((char, index) => {
        const revealed = index < revealCount;
        const nextChar = revealed
          ? char
          : char === " "
            ? " "
            : (scrambleChars[index] ?? randomCharacter(charset));

        return (
          <span key={`${index}-${char}`} className={cn(revealed ? revealedClassName : encryptedClassName)}>
            {nextChar}
          </span>
        );
      })}
    </motion.span>
  );
}
