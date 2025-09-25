import Link from "next/link";
import React from "react";

interface Props {
  size: "lg" | "xl" | "mobile-xl";
  text: string;
  link: string;
}

export default function Button(props: Props) {
  const { size, text, link } = props;

  if (size === "xl") {
    return (
      <button className="px-[2vw] py-2.5 text-[1.5vw] bg-sky-800 text-white rounded-full hover:bg-sky-200 hover:text-black cursor-pointer">
        <Link href={link}>{text}</Link>
      </button>
    );
  } else if (size === "lg") {
    return (
      <button className="px-[2vw] py-3 text-[1.2vw] bg-sky-800 text-white rounded-full hover:bg-sky-200 hover:text-black cursor-pointer">
        <Link href={link}>{text}</Link>
      </button>
    );
  } else if (size === "mobile-xl") {
    return (
      <button className="px-[4vw] py-2.5 bg-sky-800 text-white rounded-3xl hover:bg-sky-200 hover:text-black cursor-pointer">
        <Link href={link}>{text}</Link>
      </button>
    );
  }
}
