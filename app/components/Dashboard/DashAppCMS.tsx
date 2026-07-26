"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useUrlQueryState } from "@/lib/hooks/useUrlQueryState";
import { useCollapsibleMount } from "@/lib/hooks/useCollapsibleMount";
import {
  APP_CMS_PREVIEW_STORAGE_KEY,
  getDateTimeStamp,
  getIconImages,
  type IconImage,
} from "@/lib/supabase/supabaseHelper";
import AlertNotif from "../AlertNotif";
import AccordionToggleIcon from "../AccordionToggleIcon";
import SpinnerLoading from "../SpinnerLoading";

type Locale = "id" | "en";

type AppLabel = {
  id?: string;
  component: string;
  type: "text" | "textarea" | "number" | "image" | "icon" | string;
  target: string;
  value: string;
  locale: string;
  is_active: boolean;
};

type OriginalLabelValue = {
  value: string;
  is_active: boolean;
};

type PendingLocaleSync = {
  groupKey: string;
  rows: AppLabel[];
  destinationLocale: Locale;
  destinationRows: AppLabel[];
  hasBlankValue: boolean;
};

type LocaleEditSession = PendingLocaleSync & {
  sourceLocale: Locale;
};

type PendingNavigation = {
  href: string;
  stage: "cancel" | "reuse";
};

type PreviewDevice = "mobile" | "tablet" | "desktop";

type AppCmsPreview = {
  component: string;
  groupTitle: string;
  url: string;
};

const PREVIEW_DEVICE_MIN_WIDTH: Record<PreviewDevice, number> = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};

const PAGE_PREVIEW_ROUTES: Record<string, string> = {
  page_privacy: "/kebijakan-privasi",
  page_terms: "/syarat-dan-ketentuan",
  page_accessibility: "/aksesibilitas",
  page_contact: "/kontak",
};

function getLargestAvailablePreviewDevice(width: number): PreviewDevice {
  if (width >= PREVIEW_DEVICE_MIN_WIDTH.desktop) return "desktop";
  if (width >= PREVIEW_DEVICE_MIN_WIDTH.tablet) return "tablet";
  return "mobile";
}

const IMAGE_BUCKET = "images";
const ICON_FOLDER = "icon_images";
const IMAGE_FOLDER = "assets";

const locales: { value: Locale; label: string }[] = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];

const localeValues = locales.map((item) => item.value);

const LABEL_ORDER = [
  ["navbar", "nav_org_logo"],
  ["navbar", "nav_org_name_main"],
  ["navbar", "nav_org_name_sub"],
  ["navbar", "nav_locale"],
  ["navbar", "nav_menu_data"],
  ["navbar", "nav_menu_contact"],
  ["navbar", "nav_menu_login"],
  ["navbar", "nav_menu_loggedin"],
  ["navbar", "nav_menu_profile"],
  ["navbar", "nav_menu_logout"],

  ["hero", "hero_title"],
  ["hero", "hero_eyebrow"],
  ["hero", "hero_subtitle"],
  ["hero", "hero_button_label"],
  ["hero", "hero_button_path"],
  ["hero", "hero_secondary_button_label"],
  ["hero", "hero_secondary_button_path"],
  ["hero", "hero_image_desktop"],
  ["hero", "hero_image_mobile"],

  ["sectwo", "sectwo_icon_path_1"],
  ["sectwo", "sectwo_eyebrow"],
  ["sectwo", "sectwo_title"],
  ["sectwo", "sectwo_subtitle"],
  ["sectwo", "sectwo_icon_path_2"],
  ["sectwo", "sectwo_icon_path_3"],
  ["sectwo", "sectwo_icon_path_4"],
  ["sectwo", "sectwo_icon_path_5"],
  ["sectwo", "sectwo_icon_path_6"],
  ["sectwo", "sectwo_tab_num_1"],
  ["sectwo", "sectwo_tab_num_2"],
  ["sectwo", "sectwo_tab_num_3"],
  ["sectwo", "sectwo_tab_num_4"],
  ["sectwo", "sectwo_tab_num_5"],
  ["sectwo", "sectwo_tab_num_6"],
  ["sectwo", "sectwo_tab_num_suffix_1"],
  ["sectwo", "sectwo_tab_num_suffix_2"],
  ["sectwo", "sectwo_tab_num_suffix_3"],
  ["sectwo", "sectwo_tab_num_suffix_4"],
  ["sectwo", "sectwo_tab_num_suffix_5"],
  ["sectwo", "sectwo_tab_num_suffix_6"],
  ["sectwo", "sectwo_tab_title_1"],
  ["sectwo", "sectwo_tab_title_2"],
  ["sectwo", "sectwo_tab_title_3"],
  ["sectwo", "sectwo_tab_title_4"],
  ["sectwo", "sectwo_tab_title_5"],
  ["sectwo", "sectwo_tab_title_6"],
  ["sectwo", "sectwo_tab_subtitle_1"],
  ["sectwo", "sectwo_tab_subtitle_2"],
  ["sectwo", "sectwo_tab_subtitle_3"],
  ["sectwo", "sectwo_tab_subtitle_4"],
  ["sectwo", "sectwo_tab_subtitle_5"],
  ["sectwo", "sectwo_tab_subtitle_6"],

  ["secfive", "secfive_title"],
  ["secfive", "secfive_eyebrow"],
  ["secfive", "secfive_subtitle_1"],
  ["secfive", "secfive_subtitle_2"],
  ["secfive", "secfive_image_path"],
  ["secfive", "secfive_map_path"],
  ["secfive", "secfive_button_label"],
  ["secfive", "secfive_button_path"],

  ["footer", "footer_copyright_title"],
  ["footer", "footer_org_logo"],
  ["footer", "footer_org_name_main"],
  ["footer", "footer_org_name_sub"],
  ["footer", "footer_copyright_subtitle"],
  ["footer", "footer_copyright_subtitle_path"],
  ["footer", "socmed_facebook"],
  ["footer", "socmed_instagram"],
  ["footer", "socmed_youtube"],
  ["footer", "socmed_xtwitter"],
  ["footer", "socmed_tiktok"],
  ["footer", "footer_tab_title_1"],
  ["footer", "footer_tab_title_2"],
  ["footer", "footer_tab_title_3"],
  ["footer", "footer_tab_label_1_1"],
  ["footer", "footer_tab_label_1_2"],
  ["footer", "footer_tab_label_1_3"],
  ["footer", "footer_tab_label_1_4"],
  ["footer", "footer_tab_label_1_5"],
  ["footer", "footer_tab_label_2_1"],
  ["footer", "footer_tab_label_2_2"],
  ["footer", "footer_tab_label_2_3"],
  ["footer", "footer_tab_label_2_4"],
  ["footer", "footer_tab_label_2_5"],
  ["footer", "footer_tab_label_3_1"],
  ["footer", "footer_tab_label_3_2"],
  ["footer", "footer_tab_label_3_3"],
  ["footer", "footer_tab_label_3_4"],
  ["footer", "footer_tab_label_3_5"],
  ["footer", "footer_tab_label_1_1_path"],
  ["footer", "footer_tab_label_1_2_path"],
  ["footer", "footer_tab_label_1_3_path"],
  ["footer", "footer_tab_label_1_4_path"],
  ["footer", "footer_tab_label_1_5_path"],
  ["footer", "footer_tab_label_2_1_path"],
  ["footer", "footer_tab_label_2_2_path"],
  ["footer", "footer_tab_label_2_3_path"],
  ["footer", "footer_tab_label_2_4_path"],
  ["footer", "footer_tab_label_2_5_path"],
  ["footer", "footer_tab_label_3_1_path"],
  ["footer", "footer_tab_label_3_2_path"],
  ["footer", "footer_tab_label_3_3_path"],
  ["footer", "footer_tab_label_3_4_path"],
  ["footer", "footer_tab_label_3_5_path"],

  ["page_data", "page_data_title"],
  ["page_data", "page_data_subtitle"],

  ["page_contact", "page_contact_title"],
  ["page_contact", "page_contact_subtitle"],
  ["page_contact", "page_contact_address"],
  ["page_contact", "page_contact_name_label"],
  ["page_contact", "page_contact_name_placeholder"],
  ["page_contact", "page_contact_email_label"],
  ["page_contact", "page_contact_email_placeholder"],
  ["page_contact", "page_contact_phone_label"],
  ["page_contact", "page_contact_phone_placeholder"],
  ["page_contact", "page_contact_message_label"],
  ["page_contact", "page_contact_message_placeholder"],
  ["page_contact", "page_contact_submit_label"],

  ...["eyebrow", "title", "subtitle", "updated"].map(
    (field) => ["page_privacy", `page_privacy_${field}`] as const,
  ),
  ...Array.from({ length: 11 }, (_, index) => [
    ["page_privacy", `page_privacy_section_title_${index + 1}`] as const,
    ["page_privacy", `page_privacy_section_content_${index + 1}`] as const,
  ]).flat(),
  ...["eyebrow", "title", "subtitle", "updated"].map(
    (field) => ["page_terms", `page_terms_${field}`] as const,
  ),
  ...Array.from({ length: 9 }, (_, index) => [
    ["page_terms", `page_terms_section_title_${index + 1}`] as const,
    ["page_terms", `page_terms_section_content_${index + 1}`] as const,
  ]).flat(),
  ...[
    "cta_title",
    "cta_content",
    "cta_button_1_label",
    "cta_button_1_path",
    "cta_button_2_label",
    "cta_button_2_path",
  ].map((field) => ["page_terms", `page_terms_${field}`] as const),
  ...["eyebrow", "title", "subtitle", "updated"].map(
    (field) => ["page_accessibility", `page_accessibility_${field}`] as const,
  ),
  ...Array.from({ length: 4 }, (_, index) => [
    [
      "page_accessibility",
      `page_accessibility_section_title_${index + 1}`,
    ] as const,
    [
      "page_accessibility",
      `page_accessibility_section_content_${index + 1}`,
    ] as const,
  ]).flat(),
  ...[
    "cta_title",
    "cta_content",
    "cta_button_1_label",
    "cta_button_1_path",
    "cta_button_2_label",
    "cta_button_2_path",
  ].map(
    (field) => ["page_accessibility", `page_accessibility_${field}`] as const,
  ),
] as const;

const COMPONENT_ORDER = Array.from(
  new Set(LABEL_ORDER.map(([component]) => component)),
);

const componentOrderMap = new Map<string, number>(
  COMPONENT_ORDER.map((component, index) => [component, index]),
);

const labelOrderMap = new Map<string, number>(
  LABEL_ORDER.map(([component, target], index) => [
    `${component}::${target}`,
    index,
  ]),
);

function makeKey(component: string, target: string) {
  return `${component}::${target}`;
}

function getComponentOrder(component: string) {
  const normalized = component.toLowerCase();
  const categoryOrder =
    normalized === "nav" || normalized === "navbar"
      ? 0
      : normalized === "hero"
        ? 1
        : normalized.startsWith("sec")
          ? 2
          : normalized.startsWith("page")
            ? 3
            : normalized === "footer"
              ? 4
              : 5;
  const originalOrder = componentOrderMap.get(component) ?? 9999;

  return categoryOrder * 10000 + originalOrder;
}

function getLabelOrder(component: string, target: string) {
  return labelOrderMap.get(makeKey(component, target)) ?? 999999;
}

function sortLabels(a: AppLabel, b: AppLabel) {
  const componentDiff =
    getComponentOrder(a.component) - getComponentOrder(b.component);

  if (componentDiff !== 0) return componentDiff;

  const labelDiff =
    getLabelOrder(a.component, a.target) - getLabelOrder(b.component, b.target);

  if (labelDiff !== 0) return labelDiff;

  return a.target.localeCompare(b.target);
}

function getTargetRowPriority(targetValue: string) {
  const target = targetValue.toLowerCase();

  if (target.startsWith("page_")) {
    if (/(^|_)eyebrow(_|$)/.test(target)) return 0;
    if (/^page_[a-z0-9]+_title$/.test(target)) return 1;
    if (/^page_[a-z0-9]+_subtitle$/.test(target)) return 2;
    if (/(^|_)updated(_|$)/.test(target)) return 3;
    if (/(^|_)cta_title(_|$)/.test(target)) return 4;
    if (/(^|_)cta_content(_|$)/.test(target)) return 5;
    if (/(^|_)detail(_|$)/.test(target)) return 4;
    if (/(^|_)subtitle(_|$)/.test(target)) return 5;
    if (/(^|_)title(_|$)/.test(target)) return 5;
    if (/(^|_)button(_|$)/.test(target)) return 6;
    return 7;
  }

  if (/(^|_)tab_title(_|$)/.test(target)) return 2;
  if (/(^|_)tab_subtitle(_|$)/.test(target)) return 3;
  if (/(^|_)title(_|$)/.test(target)) return 0;
  if (/(^|_)subtitle(_|$)/.test(target)) return 1;
  return 4;
}

function sortGroupedLabels(a: AppLabel, b: AppLabel) {
  const rowOrder =
    getTargetRowPriority(a.target) - getTargetRowPriority(b.target);
  if (rowOrder !== 0) return rowOrder;

  const aBase = a.target.endsWith("_path") ? a.target.slice(0, -5) : a.target;
  const bBase = b.target.endsWith("_path") ? b.target.slice(0, -5) : b.target;
  const baseOrder =
    getLabelOrder(a.component, aBase) - getLabelOrder(b.component, bBase);

  if (baseOrder !== 0) return baseOrder;
  if (aBase === bBase) {
    if (a.target.endsWith("_path") === b.target.endsWith("_path")) return 0;
    return a.target.endsWith("_path") ? 1 : -1;
  }

  return sortLabels(a, b);
}

function normalizeRows(rows: unknown): AppLabel[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const item = row as Partial<AppLabel>;
    const target = String(item.target || "").trim();
    const storedType = String(item.type || "text")
      .trim()
      .toLowerCase();
    const type = /(^|_)(subtitle|content)(_|$)/.test(target.toLowerCase())
      ? "textarea"
      : storedType;

    return {
      id: item.id,
      component: String(item.component || "").trim(),
      type,
      target,
      value: String(item.value || ""),
      locale: String(item.locale || "id").trim(),
      is_active: item.is_active ?? true,
    };
  });
}

function createOriginalMap(rows: AppLabel[]) {
  return rows.reduce<Record<string, OriginalLabelValue>>((acc, item) => {
    acc[makeKey(item.component, item.target)] = {
      value: item.value || "",
      is_active: item.is_active,
    };

    return acc;
  }, {});
}

function formatComponentName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function removeComponentPrefix(component: string, target: string) {
  const prefix = `${component}_`;
  return target.startsWith(prefix) ? target.slice(prefix.length) : target;
}

function getGroupDisplayTarget(component: string, target: string) {
  const withoutComponent = removeComponentPrefix(component, target);

  if (component === "navbar" && withoutComponent.startsWith("nav_")) {
    return withoutComponent.slice(4);
  }

  return withoutComponent;
}

function getNumberedGroupName(target: string, index: string) {
  const normalizedTarget = target.toLowerCase();
  const column = /(^|_)left(_|$)/.test(normalizedTarget)
    ? "Left "
    : /(^|_)right(_|$)/.test(normalizedTarget)
      ? "Right "
      : "";
  const terminology = /(^|_)section(_|$)/.test(normalizedTarget)
    ? "Section"
    : /(^|_)tab(_|$)/.test(normalizedTarget)
      ? "Tab"
      : "Item";

  return `${column}${terminology} ${index}`;
}

type AppLabelGroup = {
  key: string;
  title: string;
  items: AppLabel[];
};

function AppCmsGroup({
  title,
  active,
  disabled,
  changed,
  updating,
  onActiveChange,
  onPreview,
  onUpdate,
  checked = false,
  forceOpen = false,
  showUpdate = true,
  children,
}: {
  title: string;
  active: boolean;
  disabled: boolean;
  changed: boolean;
  updating: boolean;
  onActiveChange: (active: boolean) => void;
  onPreview: () => void;
  onUpdate: () => void;
  checked?: boolean;
  forceOpen?: boolean;
  showUpdate?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        changed ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-4 ${isOpen ? "border-b border-slate-200" : ""}`}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <h4 className="min-w-0 break-words text-base font-bold text-slate-800">
            {title}
          </h4>
          <AccordionToggleIcon open={isOpen} size="sm" />
        </button>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="flex grow items-center justify-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
            <input
              type="checkbox"
              checked={active}
              disabled={disabled || updating}
              onChange={(event) => onActiveChange(event.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-sm font-semibold text-slate-700">
              {active ? "Aktif" : "Nonaktif"}
            </span>
          </label>

          <button
            type="button"
            onClick={onPreview}
            className="grow rounded-lg border border-sky-600 bg-white px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50"
          >
            Preview
          </button>

          {changed && showUpdate && (
            <button
              type="button"
              onClick={onUpdate}
              disabled={disabled || updating}
              className={`grow rounded-lg px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                checked
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-sky-600 text-white hover:bg-sky-700"
              }`}
            >
              {updating ? "Memeriksa..." : checked ? "✓ Checked" : "Check"}
            </button>
          )}
        </div>
      </div>

      <div
        className={`${isOpen ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} grid gap-3 ${isOpen ? "p-4" : "px-4"}`}
      >
        {children}
      </div>
    </div>
  );
}

function AppCmsComponentSection({
  component,
  forceOpen = false,
  children,
}: {
  component: string;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-sky-50 ${isOpen ? "border-b border-slate-200 bg-sky-50" : ""}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-slate-800">
            {formatComponentName(component)}
          </span>
          <span className="block min-w-0 break-words text-xs text-slate-500">
            component: {component}
          </span>
        </span>
        <AccordionToggleIcon open={isOpen} />
      </button>

      <div
        className={`${isOpen ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} ${isOpen ? "p-4" : "px-4"}`}
      >
        {children}
      </div>
    </section>
  );
}

function buildLabelGroups(
  component: string,
  items: AppLabel[],
): AppLabelGroup[] {
  const remaining = new Map(items.map((item) => [item.target, item]));
  const groups: AppLabelGroup[] = [];

  const ctaItems = items
    .filter((item) => item.target.startsWith(`${component}_cta_`))
    .sort(sortGroupedLabels);

  if (ctaItems.length > 0) {
    ctaItems.forEach((item) => remaining.delete(item.target));
    groups.push({
      key: `${component}-cta`,
      title: "CTA",
      items: ctaItems,
    });
  }

  const hierarchyParents = items
    .map((item) => {
      const suffixIndex = item.target.match(/^(.*)_title_(\d+)$/);
      if (suffixIndex) {
        return {
          item,
          prefix: suffixIndex[1],
          index: suffixIndex[2],
          contentTarget: `${suffixIndex[1]}_content_${suffixIndex[2]}`,
        };
      }

      const sectionIndex = item.target.match(/^(.*)_section_(\d+)_title$/);
      if (sectionIndex) {
        return {
          item,
          prefix: `${sectionIndex[1]}_section`,
          index: sectionIndex[2],
          contentTarget: `${sectionIndex[1]}_section_${sectionIndex[2]}_content`,
        };
      }

      return null;
    })
    .filter(
      (
        value,
      ): value is {
        item: AppLabel;
        prefix: string;
        index: string;
        contentTarget: string;
      } => value !== null,
    );

  hierarchyParents.forEach(({ item: parent, prefix, index, contentTarget }) => {
    if (!remaining.has(parent.target)) return;

    const childPrefixes = [
      `${prefix}_label_${index}_`,
      `${prefix}_item_${index}_`,
      `${prefix}_tab_label_${index}_`,
    ];
    const hierarchyItems = items
      .filter((item) => {
        const canonicalTarget = item.target.endsWith("_path")
          ? item.target.slice(0, -5)
          : item.target;

        return (
          item.target === parent.target ||
          canonicalTarget === contentTarget ||
          childPrefixes.some((childPrefix) =>
            canonicalTarget.startsWith(childPrefix),
          )
        );
      })
      .sort(sortGroupedLabels);

    if (hierarchyItems.length <= 1) return;

    hierarchyItems.forEach((item) => remaining.delete(item.target));
    groups.push({
      key: `${component}-${prefix}-item-${index}`,
      title: getNumberedGroupName(parent.target, index),
      items: hierarchyItems,
    });
  });

  const numberedGroups = new Map<
    string,
    { title: string; items: AppLabel[]; firstOrder: number }
  >();
  const fieldNames = [
    "icon_path",
    "num_suffix",
    "tab_num_suffix",
    "tab_num",
    "tab_title",
    "tab_subtitle",
    "title",
    "subtitle",
    "label",
    "image",
    "icon",
    "description",
    "content",
    "question",
    "answer",
    "date",
    "num",
    "value",
  ].join("|");

  items.forEach((item, order) => {
    if (!remaining.has(item.target)) return;

    const canonicalTarget = item.target.endsWith("_path")
      ? item.target.slice(0, -5)
      : item.target;
    const doubleIndex = canonicalTarget.match(/^(.*)_(\d+)_(\d+)$/);

    let groupKey: string | null = null;
    let groupTitle: string | null = null;

    if (doubleIndex) {
      groupKey = `${doubleIndex[1]}::${doubleIndex[2]}::${doubleIndex[3]}`;
      groupTitle = getNumberedGroupName(
        canonicalTarget,
        `${doubleIndex[2]}.${doubleIndex[3]}`,
      );
    } else {
      const singleIndex = canonicalTarget.match(
        new RegExp(`^(.*)_(${fieldNames})_(\\d+)$`),
      );

      if (singleIndex) {
        const index = singleIndex[3];
        const family =
          component === "sectwo"
            ? component
            : singleIndex[1].replace(/_tab$/, "");
        groupKey = `${family}::${index}`;
        groupTitle = getNumberedGroupName(canonicalTarget, index);
      }
    }

    if (!groupKey || !groupTitle) return;

    const existing = numberedGroups.get(groupKey);
    if (existing) {
      existing.items.push(item);
      if (groupTitle.includes("Tab ")) existing.title = groupTitle;
    } else
      numberedGroups.set(groupKey, {
        title: groupTitle,
        items: [item],
        firstOrder: order,
      });
  });

  Array.from(numberedGroups.entries())
    .filter(([, group]) => group.items.length > 1)
    .sort(([, a], [, b]) => a.firstOrder - b.firstOrder)
    .forEach(([key, group]) => {
      group.items.forEach((item) => remaining.delete(item.target));
      groups.push({
        key: `${component}-${key}`,
        title: group.title,
        items: group.items.sort(sortGroupedLabels),
      });
    });

  for (const item of Array.from(remaining.values()).sort(sortLabels)) {
    if (!remaining.has(item.target)) continue;

    const baseTarget = item.target.endsWith("_path")
      ? item.target.slice(0, -5)
      : item.target.endsWith("_label")
        ? item.target.slice(0, -6)
        : item.target;
    const labelItem =
      remaining.get(baseTarget) ?? remaining.get(`${baseTarget}_label`);
    const pathItem = remaining.get(`${baseTarget}_path`);

    if (labelItem && pathItem) {
      remaining.delete(labelItem.target);
      remaining.delete(pathItem.target);
      groups.push({
        key: `${component}-${baseTarget}`,
        title: formatComponentName(
          getGroupDisplayTarget(component, baseTarget),
        ),
        items: [labelItem, pathItem],
      });
      continue;
    }

    remaining.delete(item.target);
    groups.push({
      key: `${component}-${item.target}`,
      title: formatComponentName(getGroupDisplayTarget(component, item.target)),
      items: [item],
    });
  }

  const getDirection = (group: AppLabelGroup) => {
    const targets = group.items.map((item) => item.target.toLowerCase());
    if (targets.some((target) => /(^|_)left(_|$)/.test(target))) return 0;
    if (targets.some((target) => /(^|_)right(_|$)/.test(target))) return 1;
    return null;
  };

  const getRowPriority = (group: AppLabelGroup) => {
    return Math.min(
      ...group.items.map((item) => getTargetRowPriority(item.target)),
    );
  };

  const isCtaGroup = (group: AppLabelGroup) => group.title === "CTA";

  return groups
    .map((group, index) => ({
      group,
      index,
      rowPriority: getRowPriority(group),
      direction: getDirection(group),
    }))
    .sort((a, b) => {
      const ctaOrder =
        Number(isCtaGroup(a.group)) - Number(isCtaGroup(b.group));
      if (ctaOrder !== 0) return ctaOrder;

      const directionOrder = (a.direction ?? 2) - (b.direction ?? 2);
      if (directionOrder !== 0) return directionOrder;

      const rowOrder = a.rowPriority - b.rowPriority;
      if (rowOrder !== 0) return rowOrder;

      return a.index - b.index;
    })
    .map(({ group }) => group);
}

export default function DashAppCMS() {
  const [locale, setLocale] = useUrlQueryState<Locale>("locale", "id", {
    allowedValues: localeValues,
  });
  const [labels, setLabels] = useState<AppLabel[]>([]);
  const [originalMap, setOriginalMap] = useState<
    Record<string, OriginalLabelValue>
  >({});
  const [componentFilter, setComponentFilter] = useUrlQueryState<string>(
    "component",
    "all",
  );
  const [typeFilter, setTypeFilter] = useUrlQueryState<string>("type", "all");
  const [iconOptions, setIconOptions] = useState<IconImage[]>([]);
  const [openIconPicker, setOpenIconPicker] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingGroupKey, setUpdatingGroupKey] = useState<string | null>(null);
  const [search, setSearch] = useUrlQueryState<string>("q", "");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [navbarLocaleActive, setNavbarLocaleActive] = useState(true);
  const [savingNavbarLocale, setSavingNavbarLocale] = useState(false);
  const [pendingLocaleSync, setPendingLocaleSync] =
    useState<PendingLocaleSync | null>(null);
  const [localeEditSession, setLocaleEditSession] =
    useState<LocaleEditSession | null>(null);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const [localeSuccessNotice, setLocaleSuccessNotice] = useState<string | null>(
    null,
  );
  const [checkedLocaleTargets, setCheckedLocaleTargets] = useState<Set<string>>(
    () => new Set(),
  );
  const [showCancelEditConfirm, setShowCancelEditConfirm] = useState(false);
  const allowNavigationRef = useRef(false);
  const [preview, setPreview] = useState<AppCmsPreview | null>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewViewportWidth, setPreviewViewportWidth] = useState(0);

  useEffect(() => {
    const loadNavbarLocaleStatus = async () => {
      const { data, error } = await supabase
        .from("app_cms")
        .select("is_active")
        .eq("component", "navbar")
        .eq("target", "nav_locale")
        .eq("locale", "id")
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setNavbarLocaleActive(data?.is_active !== false);
    };

    void loadNavbarLocaleStatus();
  }, []);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem(APP_CMS_PREVIEW_STORAGE_KEY);
    };
  }, []);

  useEffect(() => {
    const updateViewportWidth = () => {
      const width = window.innerWidth;
      setPreviewViewportWidth(width);
      setPreviewDevice((current) =>
        PREVIEW_DEVICE_MIN_WIDTH[current] <= width
          ? current
          : getLargestAvailablePreviewDevice(width),
      );
    };

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const updateNavbarLocaleStatus = async (active: boolean) => {
    setSavingNavbarLocale(true);
    setErrorMsg(null);
    setMessage(null);

    const { error } = await supabase
      .from("app_cms")
      .update({ is_active: active })
      .eq("component", "navbar")
      .eq("target", "nav_locale")
      .in("locale", ["id", "en"]);

    setSavingNavbarLocale(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setNavbarLocaleActive(active);
    setLabels((current) =>
      current.map((item) =>
        item.component === "navbar" && item.target === "nav_locale"
          ? { ...item, is_active: active }
          : item,
      ),
    );
    setOriginalMap((current) => ({
      ...current,
      [makeKey("navbar", "nav_locale")]: {
        value:
          labels.find(
            (item) =>
              item.component === "navbar" && item.target === "nav_locale",
          )?.value ?? "Language selector",
        is_active: active,
      },
    }));
    setMessage(
      active
        ? "Pemilih bahasa Navbar diaktifkan."
        : "Pemilih bahasa Navbar dinonaktifkan.",
    );
    window.dispatchEvent(new Event("navbar-config-updated"));
  };

  const fetchLabels = useCallback(async (selectedLocale: Locale) => {
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const { data: templateData, error: templateError } = await supabase
      .from("app_cms")
      .select("id, component, type, target, value, locale, is_active")
      .eq("locale", "id");

    if (templateError) {
      setErrorMsg(templateError.message);
      setLoading(false);
      return;
    }

    const templateRows = normalizeRows(templateData)
      .filter((item) => item.component !== "root")
      .sort(sortLabels);

    if (selectedLocale === "id") {
      setLabels(templateRows);
      setOriginalMap(createOriginalMap(templateRows));
      setLoading(false);
      return;
    }

    const { data: localeData, error: localeError } = await supabase
      .from("app_cms")
      .select("id, component, type, target, value, locale, is_active")
      .eq("locale", selectedLocale);

    if (localeError) {
      setErrorMsg(localeError.message);
      setLoading(false);
      return;
    }

    const localeRows = normalizeRows(localeData)
      .filter((item) => item.component !== "root")
      .sort(sortLabels);

    const localeMap = new Map(
      localeRows.map((item) => [makeKey(item.component, item.target), item]),
    );

    const mergedRows: AppLabel[] = templateRows.map((template) => {
      const existing = localeMap.get(
        makeKey(template.component, template.target),
      );

      return {
        id: existing?.id,
        component: template.component,
        type: template.type,
        target: template.target,
        value: existing?.value || "",
        locale: selectedLocale,
        is_active: existing?.is_active ?? template.is_active,
      };
    });

    const sortedMergedRows = mergedRows.sort(sortLabels);

    setLabels(sortedMergedRows);
    setOriginalMap(createOriginalMap(sortedMergedRows));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLabels(locale);
    setOpenIconPicker(null);
  }, [fetchLabels, locale]);

  useEffect(() => {
    if (
      !localeEditSession ||
      loading ||
      locale !== localeEditSession.destinationLocale
    )
      return;

    const destinationMap = new Map(
      localeEditSession.destinationRows.map((item) => [
        makeKey(item.component, item.target),
        item,
      ]),
    );
    const sourceMap = new Map(
      localeEditSession.rows
        .filter((item) =>
          localeEditSession.destinationRows.some(
            (destination) => destination.target === item.target,
          ),
        )
        .map((item) => [makeKey(item.component, item.target), item]),
    );

    setLabels((current) =>
      current.map((item) => {
        const key = makeKey(item.component, item.target);
        const source = sourceMap.get(key);
        if (!source) return item;
        const destination = destinationMap.get(key);
        return {
          ...item,
          id: destination?.id ?? item.id,
          value: destination?.value?.trim() ? destination.value : source.value,
          is_active: destination?.is_active ?? source.is_active,
        };
      }),
    );
    setComponentFilter("all");
  }, [componentFilter, loading, locale, localeEditSession, setComponentFilter]);

  useEffect(() => {
    if (!localeEditSession && checkedLocaleTargets.size === 0) return;

    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptNavigation = (event: MouseEvent) => {
      if (
        allowNavigationRef.current ||
        event.defaultPrevented ||
        event.button !== 0
      )
        return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.origin !== window.location.origin
      )
        return;
      const destination = new URL(anchor.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation({ href: anchor.href, stage: "cancel" });
    };

    window.addEventListener("beforeunload", preventUnload);
    document.addEventListener("click", interceptNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", preventUnload);
      document.removeEventListener("click", interceptNavigation, true);
    };
  }, [checkedLocaleTargets.size, localeEditSession]);

  useEffect(() => {
    async function loadIconImages() {
      try {
        const icons = await getIconImages();

        setIconOptions(icons);

        if (icons.length === 0) {
          setErrorMsg(
            'Tidak ada icon ditemukan di Supabase Storage bucket "images" folder "icon_images".',
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal mengambil icon dari Supabase Storage.";

        console.error("Failed to load icon images:", message);
        setErrorMsg(message);
        setIconOptions([]);
      }
    }

    loadIconImages();
  }, []);

  const changedLabels = useMemo(() => {
    return labels.filter((item) => {
      const original = originalMap[makeKey(item.component, item.target)];

      if (!original) return false;

      return (
        item.value !== original.value || item.is_active !== original.is_active
      );
    });
  }, [labels, originalMap]);

  const changedKeySet = useMemo(() => {
    return new Set(
      changedLabels.map((item) => makeKey(item.component, item.target)),
    );
  }, [changedLabels]);

  const componentOptions = useMemo(() => {
    return Array.from(new Set(labels.map((item) => item.component))).sort(
      (a, b) => {
        const orderDiff = getComponentOrder(a) - getComponentOrder(b);
        if (orderDiff !== 0) return orderDiff;
        return a.localeCompare(b);
      },
    );
  }, [labels]);

  const typeOptions = useMemo(() => {
    return Array.from(new Set(labels.map((item) => item.type))).sort((a, b) => {
      const orderDiff = getComponentOrder(a) - getComponentOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return a.localeCompare(b);
    });
  }, [labels]);

  useEffect(() => {
    if (loading || componentOptions.length === 0) return;

    if (
      componentFilter !== "all" &&
      !componentOptions.includes(componentFilter)
    ) {
      setComponentFilter("all");
    }
  }, [componentFilter, componentOptions, setComponentFilter]);

  useEffect(() => {
    if (loading || typeOptions.length === 0) return;

    if (typeFilter !== "all" && !typeOptions.includes(typeFilter)) {
      setTypeFilter("all");
    }
  }, [typeFilter, typeOptions, setTypeFilter]);

  function getImagePreviewUrl(value: string) {
    if (!value) return "";

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/")
    ) {
      return value;
    }

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(value);
    return data.publicUrl;
  }

  function updateLabelValue(component: string, target: string, value: string) {
    setCheckedLocaleTargets((current) => {
      const next = new Set(current);
      next.delete(makeKey(component, target));
      return next;
    });
    setLabels((current) =>
      current.map((item) =>
        item.component === component && item.target === target
          ? { ...item, value }
          : item,
      ),
    );
  }

  async function handleImageUpload(label: AppLabel, file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("File harus berupa gambar.");
      return;
    }

    const key = makeKey(label.component, label.target);

    setUploadingKey(key);
    setErrorMsg(null);
    setMessage(null);

    const extension = file.name.split(".").pop() || "png";
    const filename = `${safeFileName(
      label.target,
    )}-${getDateTimeStamp(Date.now())}.${extension}`;

    const storagePath = `${label.type === "image" ? IMAGE_FOLDER : ICON_FOLDER}/${filename}`;

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type,
      });

    setUploadingKey(null);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    updateLabelValue(label.component, label.target, storagePath);
  }

  async function saveChangedRows(
    rows: AppLabel[],
    rowLocale: Locale = locale,
    mirrorActiveState = true,
  ) {
    setErrorMsg(null);
    setMessage(null);

    if (rows.length === 0) {
      setErrorMsg("Tidak ada perubahan yang perlu disimpan.");
      return false;
    }

    let updatedCount = 0;

    for (const item of rows) {
      const write = item.id
        ? supabase
            .from("app_cms")
            .update({ value: item.value || "", is_active: item.is_active })
            .eq("id", item.id)
            .eq("locale", rowLocale)
            .select("id, target, value")
        : supabase
            .from("app_cms")
            .insert({
              component: item.component,
              target: item.target,
              value: item.value || "",
              type: item.type,
              locale: rowLocale,
              is_active: item.is_active,
            })
            .select("id, target, value");
      const { data, error } = await write;

      if (error) {
        setErrorMsg(error.message);
        return false;
      }

      if (!data || data.length === 0) {
        setErrorMsg(
          `Label "${item.target}" tidak berhasil disimpan untuk locale "${rowLocale}".`,
        );
        return false;
      }

      if (mirrorActiveState) {
        const { error: mirrorError } = await supabase
          .from("app_cms")
          .update({ is_active: item.is_active })
          .eq("component", item.component)
          .eq("target", item.target)
          .neq("locale", rowLocale);

        if (mirrorError) {
          setErrorMsg(mirrorError.message);
          return false;
        }
      }

      updatedCount += data.length;
    }

    setMessage(
      `${updatedCount} perubahan label locale "${rowLocale}" berhasil disimpan.`,
    );
    window.dispatchEvent(new Event("navbar-config-updated"));
    return true;
  }

  async function performGroupUpdate(
    groupKey: string,
    rows: AppLabel[],
    destinationRows: AppLabel[] = [],
    sourceLocale: Locale = locale,
    destinationLocale: Locale = locale === "id" ? "en" : "id",
  ) {
    setUpdatingGroupKey(groupKey);
    const savesBothLocales = destinationRows.length > 0;
    const success = await saveChangedRows(
      rows,
      sourceLocale,
      !savesBothLocales,
    );

    if (success && destinationRows.length > 0) {
      const destinationSuccess = await saveChangedRows(
        destinationRows,
        destinationLocale,
        false,
      );
      if (!destinationSuccess) {
        setUpdatingGroupKey(null);
        return false;
      }
    }

    setUpdatingGroupKey(null);

    if (!success) return false;

    setOriginalMap((current) => {
      const next = { ...current };

      rows.forEach((item) => {
        next[makeKey(item.component, item.target)] = {
          value: item.value,
          is_active: item.is_active,
        };
      });

      return next;
    });
    return true;
  }

  function mapRowsToDestination(pending: PendingLocaleSync) {
    setPendingLocaleSync(null);
    setCheckedLocaleTargets(new Set());
    setLocaleEditSession({ ...pending, sourceLocale: locale });
    setComponentFilter("all");
    setTypeFilter("all");
    setSearch("");
    setLocale(pending.destinationLocale);
  }

  function copySourceRowsToDestination(pending: PendingLocaleSync) {
    const destinationMap = new Map(
      pending.destinationRows.map((item) => [
        makeKey(item.component, item.target),
        item,
      ]),
    );
    const destinationTargets = new Set(
      pending.destinationRows.map((item) => item.target),
    );
    return pending.rows
      .filter((source) => destinationTargets.has(source.target))
      .map((source) => {
        const destination = destinationMap.get(
          makeKey(source.component, source.target),
        );
        return {
          ...source,
          id: destination?.id,
          locale: pending.destinationLocale,
        };
      });
  }

  function navigateAfterLocaleSession(href: string) {
    allowNavigationRef.current = true;
    sessionStorage.removeItem(APP_CMS_PREVIEW_STORAGE_KEY);
    window.location.assign(href);
  }

  async function reuseSourceAndNavigate() {
    if (!localeEditSession || !pendingNavigation) return;
    const destinationRows = copySourceRowsToDestination(localeEditSession);
    const success = await performGroupUpdate(
      localeEditSession.groupKey,
      localeEditSession.rows,
      destinationRows,
      localeEditSession.sourceLocale,
      localeEditSession.destinationLocale,
    );
    if (!success) return;
    const href = pendingNavigation.href;
    setLocaleEditSession(null);
    setPendingNavigation(null);
    navigateAfterLocaleSession(href);
  }

  function checkLocaleTarget(label: AppLabel) {
    const key = makeKey(label.component, label.target);
    setCheckedLocaleTargets((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function checkGroupItems(groupItems: AppLabel[]) {
    setCheckedLocaleTargets((current) => {
      const next = new Set(current);
      groupItems.forEach((item) => {
        const key = makeKey(item.component, item.target);
        if (changedKeySet.has(key)) next.add(key);
      });
      return next;
    });
  }

  async function saveCheckedChanges() {
    if (localeEditSession) {
      await commitLocaleEditSession();
      return;
    }

    const rows = labels.filter((item) =>
      checkedLocaleTargets.has(makeKey(item.component, item.target)),
    );
    if (rows.length === 0) return;
    const valueRows = rows.filter((item) => {
      const original = originalMap[makeKey(item.component, item.target)];
      return original?.value !== item.value;
    });
    if (valueRows.length === 0) {
      const success = await performGroupUpdate(
        "checked-session",
        rows,
        [],
        locale,
      );
      if (success) setCheckedLocaleTargets(new Set());
      return;
    }

    const destinationLocale: Locale = locale === "id" ? "en" : "id";
    const { data, error } = await supabase
      .from("app_cms")
      .select("id, component, type, target, value, locale, is_active")
      .eq("locale", destinationLocale);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    const destinationMap = new Map(
      normalizeRows(data).map((item) => [
        makeKey(item.component, item.target),
        item,
      ]),
    );
    const destinationRows = valueRows.map(
      (source) =>
        destinationMap.get(makeKey(source.component, source.target)) ?? {
          ...source,
          id: undefined,
          value: "",
          locale: destinationLocale,
        },
    );
    setPendingLocaleSync({
      groupKey: "checked-session",
      rows,
      destinationLocale,
      destinationRows,
      hasBlankValue: destinationRows.some((item) => !item.value.trim()),
    });
  }

  function cancelCheckedChanges() {
    if (localeEditSession) {
      const sourceLocale = localeEditSession.sourceLocale;
      setLocaleEditSession(null);
      setCheckedLocaleTargets(new Set());
      setShowCancelEditConfirm(false);
      setLocale(sourceLocale);
      return;
    }
    setLabels((current) =>
      current.map((item) => {
        const original = originalMap[makeKey(item.component, item.target)];
        return original
          ? { ...item, value: original.value, is_active: original.is_active }
          : item;
      }),
    );
    setCheckedLocaleTargets(new Set());
    setShowCancelEditConfirm(false);
  }

  async function commitLocaleEditSession() {
    if (!localeEditSession) return;
    const destinationKeys = new Set(
      localeEditSession.destinationRows.map((item) =>
        makeKey(item.component, item.target),
      ),
    );
    const destinationRows = labels.filter((item) =>
      destinationKeys.has(makeKey(item.component, item.target)),
    );
    const success = await performGroupUpdate(
      localeEditSession.groupKey,
      localeEditSession.rows,
      destinationRows,
      localeEditSession.sourceLocale,
      localeEditSession.destinationLocale,
    );
    if (!success) return;
    const sourceLocale = localeEditSession.sourceLocale;
    const destinationLocale = localeEditSession.destinationLocale;
    setLocaleEditSession(null);
    setCheckedLocaleTargets(new Set());
    setLocaleSuccessNotice(
      `Perubahan locale "${sourceLocale}" dan "${destinationLocale}" berhasil disimpan.`,
    );
    await fetchLabels(locale);
  }

  function openPreview(component: string, groupTitle: string) {
    sessionStorage.setItem(
      APP_CMS_PREVIEW_STORAGE_KEY,
      JSON.stringify({
        locale,
        labels: labels.map((item) => ({
          component: item.component,
          target: item.target,
          value: item.value,
          is_active: item.is_active,
        })),
      }),
    );

    const previewRoute = PAGE_PREVIEW_ROUTES[component] ?? "/app-cms-preview";
    const previewParams = new URLSearchParams({
      cmsPreview: "1",
      component,
      draft: String(Date.now()),
    });

    setPreviewDevice(getLargestAvailablePreviewDevice(window.innerWidth));
    setPreview({
      component,
      groupTitle,
      url: `${previewRoute}?${previewParams.toString()}`,
    });
  }

  function closePreview() {
    setPreview(null);
    sessionStorage.removeItem(APP_CMS_PREVIEW_STORAGE_KEY);
  }

  function renderInput(label: AppLabel) {
    const commonClass =
      "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

    const key = makeKey(label.component, label.target);
    const previewUrl = getImagePreviewUrl(label.value);

    if (
      label.type === "image" &&
      (typeFilter === "all" || typeFilter === "image")
    ) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={label.target}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No image</span>
              )}
            </div>

            <label
              htmlFor={`upload-${key}`}
              className={`w-fit rounded-lg px-4 py-2 text-sm font-bold text-white ${
                !label.id || uploadingKey === key
                  ? "cursor-not-allowed bg-slate-400 opacity-60"
                  : "cursor-pointer bg-sky-600"
              }`}
            >
              {uploadingKey === key ? "Mengupload..." : "Ubah"}
            </label>

            <input
              id={`upload-${key}`}
              type="file"
              accept="image/*"
              disabled={uploadingKey === key}
              onChange={(e) => {
                handleImageUpload(label, e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </div>

          <input
            type="text"
            value={label.value}
            onChange={(e) =>
              updateLabelValue(label.component, label.target, e.target.value)
            }
            className={commonClass}
          />
        </div>
      );
    }

    if (
      label.type === "icon" &&
      (typeFilter === "all" || typeFilter === "icon")
    ) {
      const isOpen = openIconPicker === key;

      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={label.target}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No icon</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpenIconPicker(isOpen ? null : key)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ubah
            </button>
          </div>

          {isOpen && (
            <div className="flex flex-wrap max-h-72 grid-cols-4 gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:grid-cols-8">
              {iconOptions.length === 0 ? (
                <p className="col-span-4 text-sm text-slate-500 md:col-span-8">
                  Tidak ada icon ditemukan.
                </p>
              ) : (
                iconOptions.map((icon) => (
                  <button
                    key={icon.path}
                    type="button"
                    onClick={() => {
                      updateLabelValue(
                        label.component,
                        label.target,
                        icon.path,
                      );
                      setOpenIconPicker(null);
                    }}
                    className={`flex h-16 w-[25%] grow items-center justify-center rounded-lg border bg-slate-50 p-2 hover:border-sky-500 ${
                      label.value === icon.path
                        ? "border-sky-500 ring-2 ring-sky-200"
                        : "border-slate-200"
                    }`}
                    title={icon.name}
                  >
                    <img
                      src={icon.url}
                      alt={icon.name}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))
              )}
            </div>
          )}

          <input
            type="text"
            value={label.value}
            onChange={(e) =>
              updateLabelValue(label.component, label.target, e.target.value)
            }
            className={commonClass}
          />
        </div>
      );
    }

    if (
      label.type === "textarea" &&
      (typeFilter === "all" || typeFilter === "textarea")
    ) {
      return (
        <textarea
          value={label.value}
          rows={4}
          onChange={(e) =>
            updateLabelValue(label.component, label.target, e.target.value)
          }
          className={`${commonClass} min-h-28`}
        />
      );
    }

    if (
      label.type === "number" &&
      (typeFilter === "all" || typeFilter === "number")
    ) {
      return (
        <input
          type="number"
          value={label.value}
          disabled={!label.id}
          onChange={(e) =>
            updateLabelValue(label.component, label.target, e.target.value)
          }
          className={commonClass}
        />
      );
    }

    return (
      <input
        type="text"
        value={label.value}
        onChange={(e) =>
          updateLabelValue(label.component, label.target, e.target.value)
        }
        className={commonClass}
      />
    );
  }

  const groupedLabels = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const oppositeDraftKeys = new Set(
      localeEditSession?.destinationRows.map((item) =>
        makeKey(item.component, item.target),
      ) ?? [],
    );
    const oppositeDraftActive = localeEditSession?.destinationLocale === locale;

    const filtered = labels.filter((item) => {
      if (item.component === "navbar" && item.target === "nav_locale") {
        return false;
      }

      if (
        oppositeDraftActive &&
        !oppositeDraftKeys.has(makeKey(item.component, item.target))
      ) {
        return false;
      }

      const matchComponent =
        componentFilter === "all" || item.component === componentFilter;

      const matchType = typeFilter === "all" || item.type === typeFilter;

      const matchSearch =
        !keyword ||
        item.component.toLowerCase().includes(keyword) ||
        item.target.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword) ||
        item.value.toLowerCase().includes(keyword);

      return matchComponent && matchType && matchSearch;
    });

    const grouped = filtered.reduce<Record<string, AppLabel[]>>((acc, item) => {
      if (!acc[item.component]) acc[item.component] = [];
      acc[item.component].push(item);
      return acc;
    }, {});

    Object.keys(grouped).forEach((component) => {
      grouped[component].sort(sortLabels);
    });

    return grouped;
  }, [labels, search, componentFilter, typeFilter, locale, localeEditSession]);

  const checkedChangeCount = checkedLocaleTargets.size;
  const showBottomActions =
    checkedChangeCount > 0 || Boolean(localeEditSession);
  const bottomActions = useCollapsibleMount(showBottomActions);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  const localeSelect = true;
  const localeMandatoryComplete =
    !localeEditSession ||
    localeEditSession.destinationRows.every((item) =>
      checkedLocaleTargets.has(makeKey(item.component, item.target)),
    );

  return (
    <div className="relative flex min-h-[70vh] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-3 text-2xl font-bold">App CMS</h1>
          <p className="text-sm text-slate-600">
            Content Management System (CMS) <br />
            Edit teks aplikasi berdasarkan component, target, dan bahasa.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-md md:grid-cols-[220px_220px_1fr]">
        <div className="w-full sm:w-auto sm:min-w-44">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Perubahan Bahasa
          </label>
          <select
            value={navbarLocaleActive ? "active" : "inactive"}
            disabled={savingNavbarLocale}
            onChange={(event) =>
              void updateNavbarLocaleStatus(event.target.value === "active")
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {/* //! FILTER LOCALE / LANGUAGE */}
        {localeSelect && (
          <div className="min-w-44 grow">
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Bahasa
            </label>

            <select
              value={locale}
              disabled={Boolean(localeEditSession)}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {locales.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* //! FILTER COMPONENT */}
        <div className="grow">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Component
          </label>

          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="all">Semua Component</option>

            {componentOptions.map((component) => (
              <option key={component} value={component}>
                {formatComponentName(component)}
              </option>
            ))}
          </select>
        </div>

        {/* //! FILTER TYPE */}
        <div className="grow">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Type
          </label>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="all">Semua Type</option>

            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {formatComponentName(type)}
              </option>
            ))}
          </select>
        </div>

        {/* //! SEARCH LABEL */}
        <div className="grow">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Cari Label
          </label>

          <input
            type="text"
            placeholder="Cari target atau value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {(message || errorMsg) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            errorMsg
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {errorMsg || message}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {Object.entries(groupedLabels).length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm shadow-md">
            Tidak ada label.
          </div>
        ) : (
          Object.entries(groupedLabels)
            .sort(([a], [b]) => {
              const orderDiff = getComponentOrder(a) - getComponentOrder(b);
              if (orderDiff !== 0) return orderDiff;
              return a.localeCompare(b);
            })
            .map(([component, items]) => (
              <AppCmsComponentSection
                key={component}
                component={component}
                forceOpen={
                  localeEditSession?.destinationRows.some(
                    (item) => item.component === component,
                  ) === true && localeEditSession.destinationLocale === locale
                }
              >
                <div className="grid grid-cols-1 gap-4">
                  {buildLabelGroups(component, items).map((group) => {
                    const mappedTargets = new Set(
                      localeEditSession?.destinationRows.map(
                        (item) => item.target,
                      ) ?? [],
                    );
                    const isMappedComponent =
                      localeEditSession?.destinationRows.some(
                        (item) => item.component === component,
                      ) === true &&
                      localeEditSession.destinationLocale === locale;
                    const visibleItems = isMappedComponent
                      ? group.items.filter((item) =>
                          mappedTargets.has(item.target),
                        )
                      : group.items;
                    if (isMappedComponent && visibleItems.length === 0) {
                      return null;
                    }
                    const groupActive = visibleItems.every(
                      (item) => item.is_active,
                    );
                    const groupChanged =
                      visibleItems.some((item) =>
                        changedKeySet.has(makeKey(item.component, item.target)),
                      ) ||
                      (localeEditSession?.groupKey === group.key &&
                        localeEditSession.destinationLocale === locale);
                    const groupTargets = new Set(
                      visibleItems.map((item) => item.target),
                    );
                    const changedGroupItems = visibleItems.filter((item) =>
                      changedKeySet.has(makeKey(item.component, item.target)),
                    );
                    const groupChecked =
                      changedGroupItems.length > 0 &&
                      changedGroupItems.every((item) =>
                        checkedLocaleTargets.has(
                          makeKey(item.component, item.target),
                        ),
                      );

                    return (
                      <AppCmsGroup
                        key={group.key}
                        title={group.title}
                        active={groupActive}
                        disabled={false}
                        changed={groupChanged}
                        updating={updatingGroupKey === group.key}
                        forceOpen={isMappedComponent}
                        showUpdate={!isMappedComponent}
                        checked={groupChecked}
                        onPreview={() => openPreview(component, group.title)}
                        onUpdate={() => checkGroupItems(visibleItems)}
                        onActiveChange={(active) =>
                          (() => {
                            setCheckedLocaleTargets((current) => {
                              const next = new Set(current);
                              visibleItems.forEach((item) =>
                                next.delete(
                                  makeKey(item.component, item.target),
                                ),
                              );
                              return next;
                            });
                            setLabels((current) =>
                              current.map((item) =>
                                item.component === component &&
                                groupTargets.has(item.target)
                                  ? { ...item, is_active: active }
                                  : item,
                              ),
                            );
                          })()
                        }
                      >
                        {visibleItems.map((label) => {
                          const key = makeKey(label.component, label.target);
                          const isChanged = changedKeySet.has(key);
                          const isChecked = checkedLocaleTargets.has(key);

                          return (
                            <div
                              key={key}
                              className={`grid grid-cols-1 gap-2 rounded-lg p-3 md:grid-cols-[240px_1fr] ${
                                isChanged ? "bg-white" : "bg-slate-100/70"
                              }`}
                            >
                              <div>
                                <label className="block min-w-0 break-words text-sm font-bold text-slate-700">
                                  {label.target}
                                </label>
                                <p className="text-xs text-slate-400">
                                  type: {label.type}
                                </p>
                                <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={label.is_active}
                                    onChange={(event) => {
                                      setCheckedLocaleTargets((current) => {
                                        const next = new Set(current);
                                        next.delete(key);
                                        return next;
                                      });
                                      setLabels((current) =>
                                        current.map((item) =>
                                          makeKey(
                                            item.component,
                                            item.target,
                                          ) === key
                                            ? {
                                                ...item,
                                                is_active: event.target.checked,
                                              }
                                            : item,
                                        ),
                                      );
                                    }}
                                    className="h-4 w-4"
                                  />
                                  {label.is_active ? "Aktif" : "Nonaktif"}
                                </label>
                                {!label.id && (
                                  <p className="mt-1 text-xs text-rose-500">
                                    Row locale belum ada dan akan dibuat saat
                                    disimpan.
                                  </p>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-col gap-3">
                                {renderInput(label)}
                                {isMappedComponent && (
                                  <button
                                    type="button"
                                    onClick={() => checkLocaleTarget(label)}
                                    className={`self-end rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                                      isChecked
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-sky-600 text-white hover:bg-sky-700"
                                    }`}
                                  >
                                    {isChecked ? "✓ Checked" : "Check"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </AppCmsGroup>
                    );
                  })}
                </div>
              </AppCmsComponentSection>
            ))
        )}
      </div>

      {bottomActions.mounted && (
        <div
          className={`${bottomActions.closing ? "bottom-menu-collapse" : "bottom-menu-expand"} sticky bottom-0 z-30 mt-auto flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.14)] backdrop-blur md:flex-row md:items-center md:justify-end`}
        >
          <button
            type="button"
            onClick={() => setShowCancelEditConfirm(true)}
            disabled={Boolean(updatingGroupKey)}
            className="w-full grow basis-0 rounded-xl border border-rose-600 bg-white px-5 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveCheckedChanges()}
            disabled={Boolean(updatingGroupKey) || !localeMandatoryComplete}
            className="w-full grow basis-0 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updatingGroupKey
              ? "Menyimpan..."
              : `Simpan Perubahan (${checkedChangeCount})`}
          </button>
        </div>
      )}

      {pendingLocaleSync && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg={
            pendingLocaleSync.hasBlankValue
              ? `Sebagian nilai locale "${pendingLocaleSync.destinationLocale}" masih kosong. Apakah boleh menggunakan nilai yang sama dari locale "${locale}"?`
              : `Locale "${pendingLocaleSync.destinationLocale}" sudah memiliki nilai. Apakah Anda ingin memperbarui bahasa tersebut juga?`
          }
          icon="warning"
          loading={updatingGroupKey === pendingLocaleSync.groupKey}
          confirm={(confirmed) => {
            const pending = pendingLocaleSync;
            if (pending.hasBlankValue && confirmed) {
              const destinationRows = copySourceRowsToDestination(pending);
              void performGroupUpdate(
                pending.groupKey,
                pending.rows,
                destinationRows,
                locale,
                pending.destinationLocale,
              ).then((success) => {
                if (success) {
                  setCheckedLocaleTargets(new Set());
                  setLocaleSuccessNotice(
                    `Locale "${pending.destinationLocale}" juga diperbarui menggunakan nilai yang sama dari locale "${locale}".`,
                  );
                }
                setPendingLocaleSync(null);
              });
              return;
            }
            if (pending.hasBlankValue || confirmed) {
              mapRowsToDestination(pending);
              return;
            }
            void performGroupUpdate(
              pending.groupKey,
              pending.rows,
              [],
              locale,
            ).then((success) => {
              if (success) setCheckedLocaleTargets(new Set());
              setPendingLocaleSync(null);
            });
          }}
        />
      )}

      {localeSuccessNotice && (
        <AlertNotif
          type="single"
          yesText="Oke"
          msg={localeSuccessNotice}
          icon="success"
          confirm={() => setLocaleSuccessNotice(null)}
        />
      )}

      {showCancelEditConfirm && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg="Batalkan seluruh edit yang tersimpan dalam sesi ini?"
          icon="warning"
          confirm={(confirmed) => {
            if (confirmed) {
              cancelCheckedChanges();
              return;
            }
            setShowCancelEditConfirm(false);
          }}
        />
      )}

      {pendingNavigation?.stage === "cancel" && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg="Perubahan bahasa lain belum disimpan. Batalkan seluruh update dan tinggalkan halaman?"
          icon="warning"
          confirm={(confirmed) => {
            if (confirmed) {
              const href = pendingNavigation.href;
              setLocaleEditSession(null);
              setCheckedLocaleTargets(new Set());
              setPendingNavigation(null);
              navigateAfterLocaleSession(href);
              return;
            }
            if (!localeEditSession) {
              setPendingNavigation(null);
              return;
            }
            setPendingNavigation((current) =>
              current ? { ...current, stage: "reuse" } : null,
            );
          }}
        />
      )}

      {pendingNavigation?.stage === "reuse" && localeEditSession && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg={`Gunakan nilai locale "${localeEditSession.sourceLocale}" yang sama untuk locale "${localeEditSession.destinationLocale}" sebelum meninggalkan halaman?`}
          icon="warning"
          loading={updatingGroupKey === localeEditSession.groupKey}
          confirm={(confirmed) => {
            if (confirmed) {
              void reuseSourceAndNavigate();
              return;
            }
            setPendingNavigation(null);
          }}
        />
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[2000] flex h-dvh w-screen flex-col bg-slate-900"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${preview.groupTitle}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-950 p-3 text-white shadow-lg">
            <div className="min-w-0">
              <p className="truncate font-bold">
                Preview: {preview.groupTitle}
              </p>
              <p className="truncate text-xs text-slate-400">
                {formatComponentName(preview.component)} · Draft belum disimpan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["mobile", "Mobile · 375px"],
                  ["tablet", "Tablet · 768px"],
                  ["desktop", "Desktop · Full"],
                ] as const
              ).map(([device, label]) =>
                (() => {
                  const available =
                    previewViewportWidth >= PREVIEW_DEVICE_MIN_WIDTH[device];

                  return (
                    <button
                      key={device}
                      type="button"
                      disabled={!available}
                      onClick={() => setPreviewDevice(device)}
                      title={
                        available
                          ? undefined
                          : `Membutuhkan layar minimal ${PREVIEW_DEVICE_MIN_WIDTH[device]}px`
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600 ${
                        previewDevice === device
                          ? "bg-sky-600 text-white"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })(),
              )}

              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Tutup
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-slate-800 p-0">
            <iframe
              key={preview.url}
              src={preview.url}
              title={`Preview ${preview.groupTitle}`}
              className={`h-full shrink-0 border-0 bg-white shadow-2xl ${
                previewDevice === "desktop" ? "w-full" : ""
              }`}
              style={
                previewDevice === "mobile"
                  ? { width: Math.min(375, previewViewportWidth || 375) }
                  : previewDevice === "tablet"
                    ? { width: 768 }
                    : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
