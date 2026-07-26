// app/components/CountUpNumber.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
  className?: string;
  startOnView?: boolean;
  respectReducedMotion?: boolean;
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function CountUpNumber({
  to,
  from = 0,
  duration = 1600,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "id-ID",
  className = "",
  startOnView = true,
  respectReducedMotion = true,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  const [value, setValue] = useState(from);

  const formatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [locale, decimals]);

  const cancelAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (startedRef.current) return;

    startedRef.current = true;
    cancelAnimation();
    setValue(from);

    const shouldReduceMotion =
      respectReducedMotion &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (shouldReduceMotion) {
      setValue(to);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      const startTime = performance.now();
      const difference = to - from;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        const nextValue = from + difference * easedProgress;
        setValue(nextValue);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setValue(to);
          frameRef.current = null;
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, 80);
  }, [cancelAnimation, duration, from, respectReducedMotion, to]);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    startedRef.current = false;
    setValue(from);

    if (!startOnView) {
      startAnimation();

      return () => {
        cancelAnimation();
        startedRef.current = false;
      };
    }

    if (!("IntersectionObserver" in window)) {
      startAnimation();

      return () => {
        cancelAnimation();
        startedRef.current = false;
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        startAnimation();
        observer.unobserve(entry.target);
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimation();

      // Important for React Strict Mode in development.
      startedRef.current = false;
    };
  }, [from, startAnimation, startOnView, cancelAnimation]);

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`}>
      {prefix}
      {formatter.format(value)}
      {suffix}
    </span>
  );
}
