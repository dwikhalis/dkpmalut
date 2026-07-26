"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  getTableConfig,
  localizedItem,
  type ConfigItem,
  type ConfigTable,
} from "@/lib/tableConfig";

export default function TableConfigValue({
  table,
  field,
  value,
  form = "short",
}: {
  table: ConfigTable;
  field: "tag" | "division" | "position" | "gender";
  value: string;
  form?: "short" | "long";
}) {
  const locale = useLocaleStore((state) => state.locale);
  const [items, setItems] = useState<ConfigItem[]>([]);

  useEffect(() => {
    void getTableConfig(table).then((config) => {
      const nextItems = (config as unknown as Record<string, ConfigItem[]> | null)?.[
        `${field}_items`
      ];
      setItems(nextItems ?? []);
    });
  }, [field, table]);

  return <>{localizedItem(items, value, locale, form)}</>;
}
