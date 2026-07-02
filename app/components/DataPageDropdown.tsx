// app/components/DataPageDropdown.tsx

"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LeftChevron } from "@/public/icons/iconSets";

export type DataPageOption = {
  title: string;
  slug: string;
};

interface Props {
  pages: DataPageOption[];
  backHref?: string;
  placeholder?: string;
  className?: string;
}

export default function DataPageDropdown({
  pages,
  backHref = "/data",
  placeholder = "Lihat Data Lainnya",
  className = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const dropdownOptions = useMemo(() => {
    return pages.filter((page) => page.title !== "Home");
  }, [pages]);

  const currentSlug = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  }, [pathname]);

  const selectedValue = dropdownOptions.some(
    (page) => page.slug === currentSlug,
  )
    ? currentSlug
    : "";

  return (
    <div className={`flex w-full min-w-0 ${className}`}>
      <Link
        href={backHref}
        className="flex cursor-pointer items-center justify-center py-0 pr-3 md:py-3 md:pr-6"
      >
        <LeftChevron className="h-5 w-5 lg:h-7 lg:w-7" />
      </Link>

      <div className="relative flex w-full min-w-0 flex-col items-center justify-center md:my-3 my-0">
        <select
          value={selectedValue}
          onChange={(event) => {
            const selectedSlug = event.target.value;

            if (!selectedSlug) return;

            router.push(`/data/${selectedSlug}`);
          }}
          className="my-3 mt-6 mb-6 h-8 w-full cursor-pointer rounded-lg border border-stone-100 bg-white px-3 text-[2.8vw] shadow-md md:text-[1.5vw] lg:h-10 lg:text-sm"
        >
          <option value="" disabled>
            {placeholder}
          </option>

          {dropdownOptions.map((page) => (
            <option key={page.slug} value={page.slug}>
              {page.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
