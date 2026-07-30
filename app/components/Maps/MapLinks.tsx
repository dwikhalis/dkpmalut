"use client";

import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { MapLink } from "@/lib/utils/mapConfig";

function getIconUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

export default function MapLinks({ links }: { links: MapLink[] }) {
  const visibleLinks = links.filter(
    (link) =>
      link.address.trim() && (link.name.trim() || Boolean(link.iconPath)),
  );

  if (visibleLinks.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {visibleLinks.map((link) => (
        <a
          key={link.id}
          href={link.address}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.name.trim() || "Buka tautan"}
          title={link.name.trim() || "Buka tautan"}
          className={`inline-flex items-center gap-3 rounded-md border border-sky-800 px-4 py-2 text-sm font-semibold transition-colors ${
            link.style === "outline"
              ? "bg-transparent text-sky-800 hover:bg-sky-50"
              : "bg-sky-800 text-white hover:bg-sky-700"
          }`}
        >
          {link.iconPath && (
            <Image
              src={getIconUrl(link.iconPath)}
              alt=""
              width={24}
              height={24}
              unoptimized
              className="size-6 rounded object-cover"
            />
          )}
          {link.name.trim() && <span>{link.name}</span>}
        </a>
      ))}
    </div>
  );
}
