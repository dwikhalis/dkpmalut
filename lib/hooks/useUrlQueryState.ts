"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type Options<T extends string> = {
  allowedValues?: readonly T[];
  deleteWhenDefault?: boolean;
};

export function useUrlQueryState<T extends string>(
  key: string,
  defaultValue: T,
  options: Options<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const readValue = useCallback(() => {
    const value = searchParams.get(key) as T | null;

    if (!value) return defaultValue;

    if (options.allowedValues && !options.allowedValues.includes(value)) {
      return defaultValue;
    }

    return value;
  }, [defaultValue, key, options.allowedValues, searchParams]);

  const [value, setValueState] = useState<T>(() => readValue());

  useEffect(() => {
    setValueState(readValue());
  }, [readValue]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (nextValue) => {
      const resolvedValue =
        typeof nextValue === "function"
          ? (nextValue as (currentValue: T) => T)(value)
          : nextValue;

      setValueState(resolvedValue);

      const nextParams = new URLSearchParams(searchParams.toString());

      if (
        options.deleteWhenDefault !== false &&
        resolvedValue === defaultValue
      ) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, resolvedValue);
      }

      const query = nextParams.toString();
      const currentQuery = searchParams.toString();

      if (query === currentQuery) {
        return;
      }

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [
      defaultValue,
      key,
      options.deleteWhenDefault,
      pathname,
      router,
      searchParams,
      value,
    ],
  );

  return [value, setValue];
}
