"use client";

import { useEffect, useState } from "react";

export function useCollapsibleMount(visible: boolean, duration = 60) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    if (!mounted) return;

    const timeout = window.setTimeout(() => {
      setMounted(false);
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [duration, mounted, visible]);

  return {
    // Mount during the same render that makes the menu visible. Previously the
    // effect added a second, expensive parent render before the menu appeared.
    mounted: visible || mounted,
    closing: !visible && mounted,
  };
}
