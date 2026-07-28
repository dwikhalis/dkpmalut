"use client";

import Link from "next/link";
import Image from "next/image";

interface Props {
  tag?: string | null;
  title: string;
  image: string;
  link: string;
  external?: boolean;
}

export default function CardData({ tag, title, image, link, external = false }: Props) {
  return (
    <Link href={link} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="block h-full">
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
