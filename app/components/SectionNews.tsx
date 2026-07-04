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
import Card from "./Card";
import { getNews } from "@/lib/supabase/supabaseHelper";
import Button from "./Button";
import Reveal from "./Reveal";

interface NewsItem {
  id: string;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
}

type CardType = "container" | "container-sm" | "container-mobile";

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

function NewsMovingCarousel({
  items,
  allNews,
  cardType,
  mode,
}: {
  items: NewsItem[];
  allNews: NewsItem[];
  cardType: CardType;
  mode: "desktop" | "tablet" | "mobile";
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
      itemGap: 50,
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
  }, [updateSetWidth, carouselItems.length]);

  useEffect(() => {
    translateXRef.current = 0;
    lastFrameTimeRef.current = null;

    updateSetWidth();
    applyTrackTransform();
    updateSlideVisuals();
  }, [
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
    return <p>Tidak ada berita.</p>;
  }

  return (
    <div
      ref={viewportRef}
      className="news-marquee w-full max-w-full pt-3 pb-20 mt-3"
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

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getNews();
        setNews(data);
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const latestNews = useMemo(() => {
    return news?.slice(-5) ?? [];
  }, [news]);

  return (
    <section>
      {/* Desktop & Tablet */}
      <Reveal animation="fade-up" className="hidden md:block pt-12">
        <div className="relative flex flex-col gap-6 py-12 mx-12 2xl:mx-24 justify-center items-center bg-sky-100 rounded-4xl shadow-2xl overflow-hidden">
          <Reveal animation="fade-up" delay={80}>
            <h2 className="text-center">BERITA TERKINI</h2>
            <h5 className="text-center">
              Kanal Informasi Kelautan dan Perikanan Maluku Utara
            </h5>
          </Reveal>

          {/* Desktop carousel */}
          <div className="hidden lg:block w-full mb-6 overflow-hidden">
            {loading ? (
              <p className="text-center">Loading...</p>
            ) : (
              <Reveal
                animation="scale-in"
                delay={160}
                className="overflow-visible"
              >
                <NewsMovingCarousel
                  items={latestNews}
                  allNews={news || []}
                  cardType="container"
                  mode="desktop"
                />
              </Reveal>
            )}
          </div>

          {/* Tablet carousel */}
          <div className="hidden md:block lg:hidden w-full mb-6 overflow-hidden">
            {loading ? (
              <p className="text-center">Loading...</p>
            ) : (
              <Reveal
                animation="scale-in"
                delay={160}
                className="overflow-visible"
              >
                <NewsMovingCarousel
                  items={latestNews}
                  allNews={news || []}
                  cardType="container-sm"
                  mode="tablet"
                />
              </Reveal>
            )}
          </div>

          <Reveal
            animation="fade-up"
            delay={300}
            className="absolute bottom-15"
          >
            <Button size="xl" text="Lainnya" link="/berita" />
          </Reveal>
        </div>
      </Reveal>

      {/* Mobile */}
      <Reveal animation="fade-up" className="md:hidden block pb-10">
        <div className="relative flex flex-col gap-3 py-6 mx-6 2xl:mx-24 justify-center items-center bg-sky-100 rounded-4xl shadow-xl ">
          <Reveal animation="fade-up" delay={80}>
            <h2 className="text-center">BERITA TERKINI</h2>
            <h5 className="text-center mx-12">
              Kanal Informasi Kelautan dan Perikanan Maluku Utara
            </h5>
          </Reveal>

          <div className="flex w-full ">
            {loading ? (
              <p className="text-center w-full">Loading...</p>
            ) : (
              <Reveal
                animation="scale-in"
                delay={160}
                className="w-full overflow-visible"
              >
                <NewsMovingCarousel
                  items={latestNews}
                  allNews={news || []}
                  cardType="container-mobile"
                  mode="mobile"
                />
              </Reveal>
            )}
          </div>

          <Reveal animation="fade-up" delay={260} className="absolute bottom-8">
            <Button size="mobile-xl" text="Lainnya" link="/berita" />
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
