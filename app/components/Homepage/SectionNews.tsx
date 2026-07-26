"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Card from "../Card";
import Button from "../Button";
import Reveal from "../Reveal";
import SpinnerLoading from "../SpinnerLoading";
import { useLocaleStore } from "@/app/Stores/localeStore";
import { getAppComponentConfig, getNews } from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  secthree_eyebrow: "Cerita dari Pesisir",
  secthree_button_label: "Lainnya",
  secthree_button_path: "/berita",
  secthree_subtitle_1: "",
  secthree_subtitle_2: "Kanal Informasi Kelautan dan Perikanan Maluku Utara",
  secthree_title: "Berita Terkini",
};

interface NewsItem {
  id: string;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
}

type CardType = "news-desktop" | "news-tablet" | "news-mobile";
type NewsMode = "desktop" | "tablet" | "mobile";

function getNewsMode(width: number): NewsMode {
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

function useNewsMode() {
  const [mode, setMode] = useState<NewsMode>("mobile");

  useEffect(() => {
    const updateMode = () => {
      setMode(getNewsMode(window.innerWidth));
    };

    updateMode();

    window.addEventListener("resize", updateMode);

    return () => {
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  return mode;
}

function getCardType(mode: NewsMode): CardType {
  if (mode === "desktop") return "news-desktop";
  if (mode === "tablet") return "news-tablet";
  return "news-mobile";
}

function duplicateToMinimum<T>(items: T[], minimum: number) {
  if (items.length === 0) return [];

  const duplicated: T[] = [];

  while (duplicated.length < minimum) {
    duplicated.push(...items);
  }

  return duplicated.slice(0, minimum);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeTranslate(value: number, setWidth: number) {
  if (setWidth <= 0) return value;

  let nextValue = value;

  while (nextValue <= -setWidth) {
    nextValue += setWidth;
  }

  while (nextValue > 0) {
    nextValue -= setWidth;
  }

  return nextValue;
}

function mergeLabelsWithFallback(
  fallback: AppLabels,
  result: Partial<AppLabels> | null | undefined,
) {
  const merged = { ...fallback };
  Object.entries(result ?? {}).forEach(([key, value]) => {
    if (typeof value === "string") merged[key] = value;
  });
  return merged;
}

function NewsMovingCarousel({
  items,
  allNews,
  cardType,
  mode,
}: {
  items: NewsItem[];
  allNews: NewsItem[];
  cardType: CardType;
  mode: NewsMode;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstSetRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const setWidthRef = useRef(0);
  const translateXRef = useRef(0);

  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);

  const dragStartXRef = useRef(0);
  const dragStartTranslateRef = useRef(0);

  const config = {
    desktop: {
      minimumSlides: 10,
      itemGap: 100,
      autoSpeed: 75,
      centerOffset: 16,
    },
    tablet: {
      minimumSlides: 10,
      itemGap: 50,
      autoSpeed: 65,
      centerOffset: 10,
    },
    mobile: {
      minimumSlides: 8,
      itemGap: 42,
      autoSpeed: 55,
      centerOffset: 0,
    },
  }[mode];

  const baseItems = useMemo(() => {
    return duplicateToMinimum(items, config.minimumSlides);
  }, [items, config.minimumSlides]);

  const carouselItems = useMemo(() => {
    return [...baseItems, ...baseItems];
  }, [baseItems]);

  const applyTrackTransform = useCallback(() => {
    const track = trackRef.current;

    if (!track) return;

    track.style.transform = `translate3d(${translateXRef.current}px, 0, 0)`;
  }, []);

  const updateSetWidth = useCallback(() => {
    const firstSet = firstSetRef.current;

    if (!firstSet) return;

    const nextWidth = firstSet.scrollWidth;

    if (nextWidth <= 0) return;

    setWidthRef.current = nextWidth;
    translateXRef.current = normalizeTranslate(
      translateXRef.current,
      nextWidth,
    );

    applyTrackTransform();
  }, [applyTrackTransform]);

  const updateSlideVisuals = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterX =
      viewportRect.left + viewportRect.width / 2 + config.centerOffset;

    const maxDistance = viewportRect.width / 2;
    const cards = viewport.querySelectorAll<HTMLElement>(".news-card-scale");

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;

      const distanceFromCenter = Math.abs(viewportCenterX - cardCenterX);
      const distanceRatio = clamp(distanceFromCenter / maxDistance, 0, 1);

      const scale = 1.08 - distanceRatio * 0.2;
      const opacity = 1 - distanceRatio * 0.42;
      const saturation = 1 - distanceRatio * 0.18;
      const zIndex = Math.round((1 - distanceRatio) * 100);

      card.style.setProperty("--news-scale", scale.toString());
      card.style.setProperty("--news-opacity", opacity.toString());
      card.style.setProperty("--news-saturation", saturation.toString());
      card.style.zIndex = String(zIndex);
    });
  }, [config.centerOffset]);

  useEffect(() => {
    updateSetWidth();

    const firstSet = firstSetRef.current;

    if (!firstSet) return;

    const handleResize = () => {
      updateSetWidth();
    };

    const supportsResizeObserver = typeof ResizeObserver !== "undefined";

    if (!supportsResizeObserver) {
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateSetWidth();
    });

    resizeObserver.observe(firstSet);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [updateSetWidth, carouselItems.length, mode, config.itemGap]);

  useEffect(() => {
    translateXRef.current = 0;
    lastFrameTimeRef.current = null;

    updateSetWidth();
    applyTrackTransform();
    updateSlideVisuals();
  }, [
    mode,
    carouselItems.length,
    updateSetWidth,
    applyTrackTransform,
    updateSlideVisuals,
  ]);

  useEffect(() => {
    const animate = (currentTime: number) => {
      const lastFrameTime = lastFrameTimeRef.current ?? currentTime;
      const deltaSeconds = (currentTime - lastFrameTime) / 1000;

      lastFrameTimeRef.current = currentTime;

      const shouldAutoMove =
        !isHoveredRef.current &&
        !isDraggingRef.current &&
        setWidthRef.current > 0;

      if (shouldAutoMove) {
        translateXRef.current = normalizeTranslate(
          translateXRef.current - config.autoSpeed * deltaSeconds,
          setWidthRef.current,
        );

        applyTrackTransform();
      }

      updateSlideVisuals();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    config.autoSpeed,
    applyTrackTransform,
    updateSlideVisuals,
    carouselItems.length,
  ]);

  const handlePointerEnter = () => {
    isHoveredRef.current = true;
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
    lastFrameTimeRef.current = null;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const viewport = viewportRef.current;

    if (!viewport) return;

    isHoveredRef.current = true;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;

    dragStartXRef.current = event.clientX;
    dragStartTranslateRef.current = translateXRef.current;

    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("news-marquee-dragging");
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    event.preventDefault();

    const deltaX = event.clientX - dragStartXRef.current;

    if (Math.abs(deltaX) > 4) {
      hasDraggedRef.current = true;
    }

    translateXRef.current = normalizeTranslate(
      dragStartTranslateRef.current + deltaX,
      setWidthRef.current,
    );

    applyTrackTransform();
    updateSlideVisuals();
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const viewport = viewportRef.current;

    isDraggingRef.current = false;
    lastFrameTimeRef.current = null;

    if (viewport) {
      viewport.classList.remove("news-marquee-dragging");

      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    }
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!hasDraggedRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    hasDraggedRef.current = false;
  };

  if (items.length === 0) {
    return <p className="w-full py-12 text-center">Tidak ada artikel.</p>;
  }

  return (
    <div
      ref={viewportRef}
      className="news-marquee mt-2 w-full max-w-full pb-20 pt-3 md:mt-3 md:pb-24"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onClickCapture={handleClickCapture}
      style={
        {
          "--news-gap": `${config.itemGap}px`,
        } as CSSProperties
      }
    >
      <div ref={trackRef} className="news-marquee-track">
        <div ref={firstSetRef} className="news-marquee-set">
          {baseItems.map((item, index) => (
            <div
              key={`first-${item.id}-${index}`}
              className="news-marquee-item"
            >
              <div className="news-card-scale flex justify-center">
                <Card type={cardType} id={item.id} data={allNews} />
              </div>
            </div>
          ))}
        </div>

        <div className="news-marquee-set" aria-hidden="true">
          {baseItems.map((item, index) => (
            <div
              key={`second-${item.id}-${index}`}
              className="news-marquee-item"
            >
              <div className="news-card-scale flex justify-center">
                <Card type={cardType} id={item.id} data={allNews} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .news-marquee {
          position: relative;
          cursor: grab;
          touch-action: pan-y;
          user-select: none;
          overflow: visible;
        }

        .news-marquee-dragging {
          cursor: grabbing;
        }

        .news-marquee * {
          user-select: none;
        }

        .news-marquee img {
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }

        .news-marquee-track {
          display: flex;
          width: max-content;
          align-items: center;
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }

        .news-marquee-set {
          display: flex;
          width: max-content;
          align-items: center;
          gap: var(--news-gap);
          padding-right: var(--news-gap);
        }

        .news-marquee-item {
          flex: 0 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          padding-top: 8px;
          padding-bottom: 8px;
        }

        .news-card-scale {
          position: relative;
          filter: saturate(var(--news-saturation, 0.85));
          transform: scale(var(--news-scale, 0.88));
          transform-origin: center center;
          transition:
            transform 140ms linear,
            opacity 140ms linear,
            filter 140ms linear;
          will-change: transform, opacity, filter;
        }

        .news-card-scale:hover {
          transform: scale(1.14);
          opacity: 1;
          filter: saturate(1);
          z-index: 999 !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .news-card-scale,
          .news-card-scale:hover {
            transform: none !important;
            opacity: 1 !important;
            filter: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function SectionNews() {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const locale = useLocaleStore((state) => state.locale);
  const mode = useNewsMode();

  const cardType = useMemo(() => getCardType(mode), [mode]);
  const buttonSize = mode === "mobile" ? "mobile-xl" : "xl";

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppComponentConfig("secthree", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result.values));
          setVisibility(result.visibility);
        }
      } catch (error) {
        console.error("Failed to load secthree labels:", error);

        if (mounted) {
          setLabels(fallbackLabels);
          setVisibility({});
        }
      }
    }

    loadLabels();

    return () => {
      mounted = false;
    };
  }, [locale]);

  useEffect(() => {
    let mounted = true;

    async function fetchNews() {
      try {
        const data = await getNews(locale);

        if (mounted) {
          setNews(data);
        }
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchNews();

    return () => {
      mounted = false;
    };
  }, [locale]);

  const latestNews = useMemo(() => {
    return news?.slice(-5) ?? [];
  }, [news]);

  return (
    <section className="bg-gradient-to-br from-amber-50/80 via-white to-sky-50 px-6 py-14 md:px-12 md:py-20 2xl:px-24">
      <Reveal
        animation="fade-up"
        className="mx-auto max-w-7xl rounded-4xl bg-white/90 shadow-xl ring-1 ring-amber-100"
      >
        <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-4xl p-6 md:gap-6 md:px-8 md:py-12">
          {visibility.secthree_eyebrow !== false ||
          visibility.secthree_title !== false ||
          visibility.secthree_subtitle_1 !== false ||
          visibility.secthree_subtitle_2 !== false ? (
            <Reveal
              animation="fade-up"
              delay={80}
              className="flex flex-col gap-2"
            >
              {visibility.secthree_eyebrow !== false && (
                <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
                  {labels.secthree_eyebrow}
                </p>
              )}
              {visibility.secthree_title !== false && (
                <h2 className="text-center">{labels.secthree_title}</h2>
              )}
              {visibility.secthree_subtitle_1 !== false && (
                <p className="mx-auto max-w-[520px] text-center text-lg font-bold leading-relaxed md:text-xl">
                  {labels.secthree_subtitle_1}
                </p>
              )}
              {visibility.secthree_subtitle_2 !== false && (
                <p className="text-center text-lg font-light leading-relaxed md:text-xl">
                  {labels.secthree_subtitle_2}
                </p>
              )}
            </Reveal>
          ) : null}

          <div className="w-full overflow-visible">
            {loading ? (
              <SpinnerLoading size="sm" color="black" />
            ) : (
              <Reveal
                animation="scale-in"
                delay={160}
                className="w-full overflow-visible"
              >
                <NewsMovingCarousel
                  items={latestNews}
                  allNews={news || []}
                  cardType={cardType}
                  mode={mode}
                />
              </Reveal>
            )}
          </div>

          {visibility.secthree_button_label !== false &&
            visibility.secthree_button_path !== false &&
            labels.secthree_button_label.trim() &&
            labels.secthree_button_path.trim() && (
              <Reveal
                animation="fade-up"
                delay={300}
                className="absolute bottom-8 md:bottom-12 lg:bottom-15"
              >
                <Button
                  size={buttonSize}
                  text={labels.secthree_button_label}
                  link={labels.secthree_button_path}
                />
              </Reveal>
            )}
        </div>
      </Reveal>
    </section>
  );
}
