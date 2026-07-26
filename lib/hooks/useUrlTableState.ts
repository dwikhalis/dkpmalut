"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ColumnLike = {
  key: string;
};

type FilterLike = {
  key: string;
};

type Options = {
  columns: ColumnLike[];
  filters?: FilterLike[];
  defaultSortKey?: string;
};

export const filterParamName = (key: string) => `f_${key}`;

export function useUrlTableState({
  columns,
  filters = [],
  defaultSortKey,
}: Options) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const readSortBy = useCallback(() => {
    const sortParam = searchParams.get("sort");
    const fallbackSort = defaultSortKey ?? columns[0]?.key ?? "";

    if (sortParam && columns.some((column) => column.key === sortParam)) {
      return sortParam;
    }

    return fallbackSort;
  }, [columns, defaultSortKey, searchParams]);

  const readFilters = useCallback(() => {
    return filters.reduce<Record<string, string>>((acc, filter) => {
      const value = searchParams.get(filterParamName(filter.key));

      if (value && value !== "all") {
        acc[filter.key] = value;
      }

      return acc;
    }, {});
  }, [filters, searchParams]);

  const readPage = useCallback(() => {
    const pageParam = Number(searchParams.get("page") || 1);

    return Number.isInteger(pageParam) && pageParam > 0 ? pageParam - 1 : 0;
  }, [searchParams]);

  const [sortBy, setSortBy] = useState(() => readSortBy());
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >(() => readFilters());
  const [page, setPage] = useState(() => readPage());

  const replaceUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value === "1") {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      });

      const query = nextParams.toString();
      const currentQuery = searchParams.toString();

      if (query === currentQuery) return;

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSortBy(readSortBy());
    setSelectedFilters(readFilters());
    setPage(readPage());
  }, [readFilters, readPage, readSortBy]);

  const updateSortBy = useCallback(
    (nextSortBy: string) => {
      setSortBy(nextSortBy);
      setPage(0);
      replaceUrlParams({
        sort: nextSortBy,
        page: null,
      });
    },
    [replaceUrlParams],
  );

  const updateFilter = useCallback(
    (key: string, nextValue: string) => {
      setSelectedFilters((prev) => ({
        ...prev,
        [key]: nextValue,
      }));
      setPage(0);
      replaceUrlParams({
        [filterParamName(key)]: nextValue,
        page: null,
      });
    },
    [replaceUrlParams],
  );

  const updatePage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      replaceUrlParams({
        page: String(nextPage + 1),
      });
    },
    [replaceUrlParams],
  );

  return {
    sortBy,
    setSortBy,
    updateSortBy,
    selectedFilters,
    setSelectedFilters,
    updateFilter,
    page,
    setPage,
    updatePage,
    replaceUrlParams,
  };
}
