"use client";

import { useCallback, useEffect, useState } from "react";

type RateLimitNotice = { message: string; retryAt: number };

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function useRateLimitCountdown() {
  const [notice, setNotice] = useState<RateLimitNotice | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!notice) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= notice.retryAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [notice]);

  const captureRateLimit = useCallback(
    (response: Response, message: string) => {
      if (response.status !== 429) return false;
      const retryAfter = Math.max(
        1,
        Number(response.headers.get("Retry-After")) || 60,
      );
      const currentTime = Date.now();
      setNow(currentTime);
      setNotice({ message, retryAt: currentTime + retryAfter * 1000 });
      return true;
    },
    [],
  );

  const remainingSeconds = notice
    ? Math.max(0, Math.ceil((notice.retryAt - now) / 1000))
    : 0;
  const rateLimitMessage = notice
    ? remainingSeconds > 0
      ? `${notice.message} Coba lagi dalam ${formatRemaining(remainingSeconds)}.`
      : "Batas permintaan telah dibuka. Silakan coba kembali."
    : "";

  return { captureRateLimit, rateLimitMessage, remainingSeconds };
}
