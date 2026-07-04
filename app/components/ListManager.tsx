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
import { Delete, Edit } from "@/public/icons/iconSets";
import AlertNotif from "./AlertNotif";

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
  labelField: DataKey;
  titleField: DataKey;
  subtitleField: DataKey;
};

const typeConfig: Record<Prop["type"], TypeConfigItem> = {
  staff: {
    fetch: getStaff,
    table: "staff",
    groupKey: "division",
    labelField: "division_long",
    titleField: "name",
    subtitleField: "title",
  },
  news: {
    fetch: getNews,
    table: "news",
    groupKey: "tag",
    labelField: "tag_long",
    titleField: "title",
    subtitleField: "date",
  },
  gallery: {
    fetch: getGallery,
    table: "gallery",
    groupKey: "tag",
    labelField: "tag_long",
    titleField: "title",
    subtitleField: "date",
  },
};

type LabelRow = Record<string, string | null>;

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
  const [data, setData] = useState<DataTypes[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState<[boolean, string]>([
    false,
    "",
  ]);

  const { fetch, table, groupKey, labelField, titleField, subtitleField } =
    typeConfig[type];

  useEffect(() => {
    let mounted = true;

    async function fetchLabels() {
      const groupColumn = String(groupKey);
      const labelColumn = String(labelField);

      const selectColumns =
        groupColumn === labelColumn
          ? groupColumn
          : `${groupColumn}, ${labelColumn}`;

      const { data: rows, error } = await supabase
        .from(table)
        .select(selectColumns);

      if (error) {
        console.error(`Failed to fetch labels from ${table}:`, error.message);

        if (mounted) {
          setLabels({});
        }

        return;
      }

      const typedRows = (rows || []) as unknown as LabelRow[];
      const nextLabels: Record<string, string> = {};

      typedRows.forEach((row) => {
        const key = row[groupColumn]?.trim();
        const value = row[labelColumn]?.trim();

        if (!key) return;

        nextLabels[key] = value || key;
      });

      if (mounted) {
        setLabels(nextLabels);
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
  }, [fetch, table, groupKey, labelField]);

  async function actionConfirmed(confirmation: boolean) {
    const dataId = confirmAction[1];

    if (!confirmation) {
      setConfirmAction([false, ""]);
      return;
    }

    setLoadingAction(true);

    const executed = await deleteData(type, dataId);

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
        const key = String(item[groupKey] || "undefined");

        if (!acc[key]) acc[key] = [];
        acc[key].push(item);

        return acc;
      },
      {} as Record<string, DataTypes[]>,
    );
  }, [data, groupKey]);

  if (loading) return <p>Loading...</p>;
  if (!data.length) return <p>Belum ada data terdaftar</p>;

  return (
    <div className="flex w-full flex-col gap-6 md:gap-12">
      {Object.entries(groupedData)
        .sort(([a], [b]) =>
          a.localeCompare(b, undefined, { sensitivity: "base" }),
        )
        .map(([key, items]) => (
          <div key={key}>
            <h4 className="mb-6 font-bold md:mb-12">
              {key === "undefined" ? "Tidak Terdata" : labels[key] || key}
            </h4>

            {items
              .sort((a, b) =>
                String(a[titleField] || "").localeCompare(
                  String(b[titleField] || ""),
                  undefined,
                  {
                    sensitivity: "base",
                  },
                ),
              )
              .map((e) => (
                <div
                  key={e.id}
                  className="my-6 flex w-full items-center justify-between rounded-xl bg-stone-100 px-3 py-3 shadow-xl md:px-10"
                >
                  <div className="flex w-[20%] items-center justify-center md:w-[30%] md:justify-start">
                    <Image
                      src={e.photo || e.image || "/assets/icon_profile_u.png"}
                      width={120}
                      height={120}
                      alt="photo"
                      className="h-12 w-12 object-contain md:h-30 md:w-30"
                    />
                  </div>

                  {/* Desktop */}
                  <h5 className="hidden w-[30%] break-words text-sm font-bold md:flex">
                    {String(e[titleField] || "")}
                  </h5>

                  <h5 className="hidden w-[30%] break-words text-sm md:flex">
                    {subtitleField === "date"
                      ? formatDate(e.date)
                      : String(e[subtitleField] || "")}
                  </h5>

                  {/* Mobile */}
                  <div className="flex w-[60%] flex-col gap-1 px-2 md:hidden">
                    <h6 className="break-words text-sm font-bold">
                      {String(e[titleField] || "")}
                    </h6>

                    <h6 className="break-words text-sm">
                      {subtitleField === "date"
                        ? formatDate(e.date)
                        : String(e[subtitleField] || "")}
                    </h6>
                  </div>

                  {admin && (
                    <div className="flex gap-2">
                      <div
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-sky-500"
                        onClick={() => sendToParent(e)}
                      >
                        <Edit className="size-6 text-white" />
                      </div>

                      <div
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-rose-500"
                        onClick={() => setConfirmAction([false, e.id])}
                      >
                        <Delete className="size-6 text-white" />
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
