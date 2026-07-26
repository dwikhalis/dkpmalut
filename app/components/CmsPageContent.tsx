"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useLocaleStore } from "@/app/Stores/localeStore";
import { getAppComponentConfig } from "@/lib/supabase/supabaseHelper";

type CmsPageConfig = {
  values: Record<string, string>;
  visibility: Record<string, boolean>;
};

const CmsPageContext = createContext<CmsPageConfig>({
  values: {},
  visibility: {},
});

export function CmsPageProvider({
  component,
  children,
}: {
  component: string;
  children: ReactNode;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const [config, setConfig] = useState<CmsPageConfig>({
    values: {},
    visibility: {},
  });
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setIsPreview(
      new URLSearchParams(window.location.search).get("cmsPreview") === "1",
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    void getAppComponentConfig(component, locale).then((result) => {
      if (mounted) setConfig(result);
    });

    return () => {
      mounted = false;
    };
  }, [component, locale]);

  return (
    <CmsPageContext.Provider value={config}>
      {isPreview && (
        <style>{`[data-app-shell] { display: none !important; }`}</style>
      )}
      {children}
    </CmsPageContext.Provider>
  );
}

export function CmsValue({
  target,
  fallback,
  as,
  className,
}: {
  target: string;
  fallback: string;
  as?: ElementType;
  className?: string;
}) {
  const { values, visibility } = useContext(CmsPageContext);
  const Component = as ?? "span";

  if (visibility[target] === false) return null;

  const value = values[target]?.trim() || fallback;

  return <Component className={className}>{value}</Component>;
}

export function useCmsText(target: string, fallback: string) {
  const { values, visibility } = useContext(CmsPageContext);

  if (visibility[target] === false) return null;

  return values[target]?.trim() || fallback;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  updated,
}: {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  updated?: string | null;
}) {
  if (!eyebrow && !title && !subtitle && !updated) return null;

  return (
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-600 px-6 py-9 text-white shadow-xl md:px-10 md:py-12">
      {eyebrow && (
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">
          {eyebrow}
        </p>
      )}
      {title && (
        <h1 className={`${eyebrow ? "mt-4" : ""} max-w-4xl text-3xl font-bold leading-tight md:text-5xl`}>
          {title}
        </h1>
      )}
      {subtitle && (
        <p className="mt-4 max-w-4xl text-base leading-8 text-sky-100 md:text-lg">
          {subtitle}
        </p>
      )}
      {updated && (
        <p className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-sm text-sky-100 ring-1 ring-white/20">
          {updated}
        </p>
      )}
    </header>
  );
}

export function CmsPageHeader({
  prefix,
  eyebrowFallback = "",
  titleFallback = "",
  subtitleFallback = "",
  updatedFallback = "",
}: {
  prefix: string;
  eyebrowFallback?: string;
  titleFallback?: string;
  subtitleFallback?: string;
  updatedFallback?: string;
}) {
  const eyebrow = useCmsText(`${prefix}_eyebrow`, eyebrowFallback);
  const title = useCmsText(`${prefix}_title`, titleFallback);
  const subtitle = useCmsText(`${prefix}_subtitle`, subtitleFallback);
  const updated = useCmsText(`${prefix}_updated`, updatedFallback);

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      updated={updated}
    />
  );
}

type PageCtaAction = {
  label: string;
  path: string;
};

export function PageCta({
  eyebrow,
  title,
  content,
  primaryAction,
  secondaryAction,
  className = "mt-8",
}: {
  eyebrow?: string;
  title?: string | null;
  content?: string | null;
  primaryAction?: PageCtaAction | null;
  secondaryAction?: PageCtaAction | null;
  className?: string;
}) {
  if (!eyebrow && !title && !content && !primaryAction && !secondaryAction) {
    return null;
  }

  return (
    <section
      className={`${className} flex flex-col items-start justify-between gap-6 rounded-3xl bg-sky-950 px-6 py-8 text-white shadow-xl md:flex-row md:items-center md:px-10 md:py-10`}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className={`${eyebrow ? "mt-2" : ""} text-2xl font-bold md:text-3xl`}>
            {title}
          </h2>
        )}
        {content && (
          <p className="mt-3 whitespace-pre-line leading-7 text-sky-100">
            {content}
          </p>
        )}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex shrink-0 flex-wrap gap-3">
          {primaryAction && (
            <Link
              href={primaryAction.path}
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 font-semibold text-sky-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-950"
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.path}
              className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-sky-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-950"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function CmsPageCta({
  prefix,
  eyebrowFallback = "",
  titleFallback = "",
  contentFallback = "",
  button1LabelFallback = "",
  button1PathFallback = "",
  button2LabelFallback = "",
  button2PathFallback = "",
}: {
  prefix: string;
  eyebrowFallback?: string;
  titleFallback?: string;
  contentFallback?: string;
  button1LabelFallback?: string;
  button1PathFallback?: string;
  button2LabelFallback?: string;
  button2PathFallback?: string;
}) {
  const { values, visibility } = useContext(CmsPageContext);
  const targets = {
    eyebrow: `${prefix}_cta_eyebrow`,
    title: `${prefix}_cta_title`,
    content: `${prefix}_cta_content`,
    button1Label: `${prefix}_cta_button_1_label`,
    button1Path: `${prefix}_cta_button_1_path`,
    button2Label: `${prefix}_cta_button_2_label`,
    button2Path: `${prefix}_cta_button_2_path`,
  };
  const configuredVisibility = Object.values(targets)
    .map((target) => visibility[target])
    .filter((state): state is boolean => state !== undefined);

  // A CTA is one action block. Avoid rendering incomplete fragments when only
  // some of its legacy CMS rows are active; hide it only when the whole group
  // has explicitly been disabled.
  if (
    configuredVisibility.length > 0 &&
    configuredVisibility.every((state) => state === false)
  ) {
    return null;
  }

  const getValue = (target: string, fallback: string) =>
    values[target]?.trim() || fallback;
  const eyebrow = getValue(targets.eyebrow, eyebrowFallback);
  const title = getValue(targets.title, titleFallback);
  const content = getValue(targets.content, contentFallback);
  const button1Label = getValue(targets.button1Label, button1LabelFallback);
  const button1Path = getValue(targets.button1Path, button1PathFallback);
  const button2Label = getValue(targets.button2Label, button2LabelFallback);
  const button2Path = getValue(targets.button2Path, button2PathFallback);
  const button1 =
    button1Label && button1Path
      ? { label: button1Label, path: button1Path }
      : null;
  const button2 =
    button2Label && button2Path
      ? { label: button2Label, path: button2Path }
      : null;

  if (!eyebrow && !title && !content && !button1 && !button2) return null;

  return (
    <PageCta
      eyebrow={eyebrow || undefined}
      title={title}
      content={content}
      primaryAction={button1}
      secondaryAction={button2}
    />
  );
}

export function CmsParagraphs({
  target,
  fallback,
  className,
}: {
  target: string;
  fallback: string | string[];
  className?: string;
}) {
  const { values, visibility } = useContext(CmsPageContext);

  if (visibility[target] === false) return null;

  const fallbackText = Array.isArray(fallback)
    ? fallback.join("\n\n")
    : fallback;
  const value = values[target]?.trim() || fallbackText;

  return (
    <div className={className}>
      {value.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={`${target}-${index}`} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function CmsList({
  target,
  fallback,
  className,
}: {
  target: string;
  fallback: string[];
  className?: string;
}) {
  const { values, visibility } = useContext(CmsPageContext);

  if (visibility[target] === false) return null;

  const items = (values[target]?.trim() || fallback.join("\n"))
    .split("\n")
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function CmsOptionalContent({
  target,
  children,
  className,
}: {
  target: string;
  children: ReactNode;
  className?: string;
}) {
  const { values, visibility } = useContext(CmsPageContext);

  if (visibility[target] === false) return null;

  const value = values[target]?.trim();

  if (!value) return children;

  return (
    <div className={className}>
      {value.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={`${target}-${index}`} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
