"use client";

import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";

interface Props {
  tag?: string | null;
  title: string;
  image: string;
  link: string;
  external?: boolean;
  resourceId?: string;
}

export default function CardData({
  tag,
  title,
  image,
  link,
  external = false,
  resourceId,
}: Props) {
  const recordExternalView = () => {
    if (!external || !resourceId) return;

    const storageKey = `public-dataset-view:dataset:${resourceId}`;
    if (window.sessionStorage.getItem(storageKey)) return;

    window.sessionStorage.setItem(storageKey, "1");
    void supabase
      .rpc("record_public_dataset_metric", {
        p_resource_kind: "dataset",
        p_resource_id: resourceId,
        p_metric: "view",
      })
      .then(({ error }) => {
        if (error) {
          window.sessionStorage.removeItem(storageKey);
          console.warn("Failed to record link dataset view:", error);
        }
      });
  };

  return (
    <Link
      href={link}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={recordExternalView}
      className="block h-full"
    >
      <article className="h-full overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
        <div className="flex h-50 items-center justify-center overflow-hidden bg-stone-100">
          <Image
            src={image ? image : "/assets/image_placeholder.png"}
            alt={title}
            width={800}
            height={600}
            className="h-full w-full object-cover transition duration-300 hover:scale-105"
            loading="eager"
          />
        </div>
        <div className="p-5">
          {tag && <p className="mb-2 text-sm text-stone-500">{tag}</p>}
          <h3 className="text-lg font-bold leading-snug text-stone-900">{title}</h3>
        </div>
      </article>
    </Link>
  );
}
