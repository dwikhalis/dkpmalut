"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type RevealAnimation = "fade-up" | "fade-left" | "fade-right" | "scale-in";

export default function Reveal({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  once = true,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  animation?: RevealAnimation;
  delay?: number;
  once?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, once]);

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ref}
      className={`home-animate home-${animation} ${
        visible ? "home-animate-in" : ""
      } ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
