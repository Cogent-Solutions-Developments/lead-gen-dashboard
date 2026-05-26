"use client";

import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";

type TypingTextProps = {
  text: string;
  className?: string;
  characterDelayMs?: number;
  textClassName?: string;
  completedContent?: ReactNode;
};

export function TypingText({
  text,
  className,
  characterDelayMs = 90,
  textClassName,
  completedContent,
}: TypingTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const words = text.split(" ");
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!inView || !text) return;

    let cancelled = false;
    let nextIndex = -1;

    const tick = () => {
      if (cancelled) return;

      nextIndex += 1;
      setVisibleCount(Math.min(nextIndex, words.length));

      if (nextIndex < words.length) {
        window.setTimeout(tick, characterDelayMs);
      }
    };

    const timeoutId = window.setTimeout(tick, characterDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [characterDelayMs, inView, text, words.length]);

  if (!text) return null;

  if (visibleCount >= words.length && completedContent) {
    return (
      <motion.span ref={ref} className={cn(className)} aria-label={text} role="text">
        {completedContent}
      </motion.span>
    );
  }

  return (
    <motion.span ref={ref} className={cn(className)} aria-label={text} role="text">
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className={cn("inline-block", textClassName)}
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={index < visibleCount ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 8, filter: "blur(6px)" }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {index < words.length - 1 ? "\u00a0" : null}
        </motion.span>
      ))}
    </motion.span>
  );
}
