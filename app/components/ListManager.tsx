"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  deleteData,
  getGallery,
  getNews,
  getStaff,
} from "@/lib/supabase/supabaseHelper";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useLocaleStore } from "@/app/Stores/localeStore";
import { getTableConfig, localizedItem, type ConfigItem } from "@/lib/tableConfig";
import { Delete, Edit } from "@/public/icons/iconSets";
import AlertNotif from "./AlertNotif";
import SpinnerLoading from "./SpinnerLoading";

interface Prop {
  admin: boolean;
  type: "staff" | "news" | "gallery";
  sendToParent?: (sendData: DataTypes) => void;
}

interface DataTypes {
  id: string;
  name?: string;
  image?: string;
  photo?: string;
  title?: string;
  position?: string;
  division?: string;
  division_long?: string;
  gender?: string;
  tag?: string;
  tag_long?: string;
  date?: string;
  content?: string;
  source?: string;
  description?: string;
  email?: string;
  phone?: string;
  message?: string;
  status?: string;
}

type DataKey = keyof DataTypes;

type TypeConfigItem = {
  fetch: () => Promise<DataTypes[] | null | undefined>;
  table: string;
  groupKey: DataKey;
  titleField: DataKey;
  subtitleField: DataKey;
};

const typeConfig: Record<Prop["type"], TypeConfigItem> = {
  staff: {
    fetch: getStaff,
    table: "staff",
    groupKey: "division",
    titleField: "name",
    subtitleField: "position",
  },
  news: {
    fetch: getNews,
    table: "news",
    groupKey: "tag",
    titleField: "title",
    subtitleField: "date",
  },
  gallery: {
    fetch: getGallery,
    table: "gallery",
    groupKey: "tag",
    titleField: "title",
    subtitleField: "date",
  },
};

function formatDate(value?: string) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ListManager({
  admin,
  type,
  sendToParent = () => {},
}: Prop) {
  const locale = useLocaleStore((state) => state.locale);
  const [data, setData] = useState<DataTypes[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [positionLabels, setPositionLabels] = useState<Record<string, string>>({});
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [groupAliases, setGroupAliases] = useState<Record<string, string>>({});
  const [positionOrder, setPositionOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState<[boolean, string]>([
    false,
    "",
  ]);

  const { fetch, table, groupKey, titleField, subtitleField } =
    typeConfig[type];

  useEffect(() => {
    let mounted = true;

    async function fetchLabels() {
      const config = await getTableConfig(type);
      const nextLabels: Record<string, string> = {};
      const nextPositions: Record<string, string> = {};
      const nextAliases: Record<string, string> = {};
      const groupItems = (type === "staff"
        ? (config as { division_items?: ConfigItem[] } | null)?.division_items
        : (config as { tag_items?: ConfigItem[] } | null)?.tag_items) as ConfigItem[] | undefined;
      groupItems?.forEach((item) => {
        nextLabels[item.key] = localizedItem(groupItems, item.key, locale, "long");
        [item.key, item.short.id, item.short.en, item.long.id, item.long.en]
          .filter(Boolean)
          .forEach((value) => { nextAliases[value.trim().toLocaleLowerCase()] = item.key; });
      });
      let nextPositionOrder: string[] = [];
      if (type === "staff") {
        const positionItems = (config as { position_items?: ConfigItem[] } | null)?.position_items;
        positionItems?.forEach((item) => { nextPositions[item.key] = localizedItem(positionItems, item.key, locale, "long"); });
        nextPositionOrder = positionItems?.map((item) => item.key) ?? [];
      }

      if (mounted) {
        setLabels(nextLabels);
        setPositionLabels(nextPositions);
        setGroupOrder(groupItems?.map((item) => item.key) ?? []);
        setGroupAliases(nextAliases);
        setPositionOrder(nextPositionOrder);
      }
    }

    async function fetchData() {
      setLoading(true);

      const [result] = await Promise.all([fetch(), fetchLabels()]);

      if (mounted) {
        setData(result || []);
        setLoading(false);
      }
    }

    fetchData();

    const channel = supabase
      .channel(`public:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        fetchData,
      )
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [fetch, table, groupKey, locale, type]);

  async function actionConfirmed(confirmation: boolean) {
    const dataId = confirmAction[1];

    if (!confirmation) {
      setConfirmAction([false, ""]);
      return;
    }

    setLoadingAction(true);

    const executed = await deleteData(table, dataId);

    setLoadingAction(false);

    if (executed) {
      setConfirmAction([true, ""]);
    } else {
      setConfirmAction([false, ""]);
    }
  }

  const groupedData = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const rawKey = String(item[groupKey] || "undefined");
        const key = groupAliases[rawKey.trim().toLocaleLowerCase()] ?? rawKey;

        if (!acc[key]) acc[key] = [];
        acc[key].push(item);

        return acc;
      },
      {} as Record<string, DataTypes[]>,
    );
  }, [data, groupAliases, groupKey]);

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <p className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-[2.8vw] shadow-md md:text-[1.5vw] lg:text-sm">
        Belum ada data terdaftar
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      {Object.entries(groupedData)
        .sort(([a], [b]) => {
          const aIndex = groupOrder.indexOf(a);
          const bIndex = groupOrder.indexOf(b);
          if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
          if (aIndex >= 0) return -1;
          if (bIndex >= 0) return 1;
          return a.localeCompare(b, undefined, { sensitivity: "base" });
        })
        .map(([key, items]) => (
          <div key={key}>
            <h2 className="mb-4 text-xl font-bold md:mb-5">
              {key === "undefined" ? "Tidak Terdata" : labels[key] || key}
            </h2>

            {[...items]
              .sort((a, b) => {
                if (type === "staff") {
                  const aPosition = positionOrder.indexOf(String(a.position || ""));
                  const bPosition = positionOrder.indexOf(String(b.position || ""));
                  if (aPosition >= 0 && bPosition >= 0 && aPosition !== bPosition) return aPosition - bPosition;
                  if (aPosition >= 0 && bPosition < 0) return -1;
                  if (aPosition < 0 && bPosition >= 0) return 1;
                }
                return String(a[titleField] || "").localeCompare(
                  String(b[titleField] || ""),
                  undefined,
                  {
                    sensitivity: "base",
                  },
                );
              })
              .map((e) => (
                <div
                  key={e.id}
                  className="my-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-md transition hover:bg-stone-50 md:gap-5 md:px-5"
                >
                  <div className="flex w-[18%] shrink-0 items-center justify-center md:w-[18%] md:justify-start lg:w-[16%]">
                    <Image
                      src={e.photo || e.image || "/assets/icon_profile_u.png"}
                      width={120}
                      height={120}
                      alt="photo"
                      className="h-12 w-12 rounded-lg object-contain md:h-16 md:w-16 lg:h-20 lg:w-20"
                    />
                  </div>

                  {/* Desktop */}
                  <span className="hidden min-w-0 flex-1 break-words text-sm font-bold md:flex">
                    {String(e[titleField] || "")}
                  </span>

                  <span className="hidden min-w-0 flex-1 break-words text-sm text-stone-600 md:flex">
                    {subtitleField === "date"
                      ? formatDate(e.date)
                      : subtitleField === "position"
                        ? positionLabels[String(e.position || "")] || String(e.position || "")
                        : String(e[subtitleField] || "")}
                  </span>

                  {/* Mobile */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 px-1 md:hidden">
                    <span className="break-words text-sm font-bold">
                      {String(e[titleField] || "")}
                    </span>

                    <span className="break-words text-sm text-stone-600">
                      {subtitleField === "date"
                        ? formatDate(e.date)
                        : subtitleField === "position"
                          ? positionLabels[String(e.position || "")] || String(e.position || "")
                          : String(e[subtitleField] || "")}
                    </span>
                  </div>

                  {admin && (
                    <div className="flex shrink-0 gap-2">
                      <div
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-600 md:h-9 md:w-9"
                        onClick={() => sendToParent(e)}
                      >
                        <Edit className="size-5 text-white md:size-6" />
                      </div>

                      <div
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-rose-500 hover:bg-rose-600 md:h-9 md:w-9"
                        onClick={() => setConfirmAction([false, e.id])}
                      >
                        <Delete className="size-5 text-white md:size-6" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}

      {confirmAction[1] && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg="Hapus data ini?"
          icon="warning"
          loading={loadingAction}
          confirm={actionConfirmed}
        />
      )}

      {confirmAction[0] && (
        <AlertNotif
          type="single"
          yesText="Ok"
          msg="Data telah dihapus"
          icon="success"
          confirm={(res) => res && setConfirmAction([false, ""])}
        />
      )}
    </div>
  );
}
