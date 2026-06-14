import Link from "next/link";

interface Props {
  size: "lg" | "xl" | "sm" | "custom" | "mobile-xl";
  text: string;
  link: string;
  color?: "red" | "blue" | "green" | "grey";
  width?: number;
  textSize?: "sm" | "lg" | "xl" | "2xl";
}

export default function Button(props: Props) {
  const { size, text, link, color, width, textSize } = props;

  const red = "bg-red-800 hover:bg-red-200";
  const blue = "bg-sky-800 hover:bg-sky-200";
  const green = "bg-green-600 hover:bg-green-200";
  const grey = "bg-gray-600 hover:bg-gray-200";

  //! XL Size
  if (size === "xl" && link !== "none") {
    return (
      <div className="flex justify-center items-center">
        <button
          className={`px-[2vw] py-2.5 text-[1.5vw] ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-full hover:text-black cursor-pointer`}
        >
          <Link href={link}>{text}</Link>
        </button>
      </div>
    );
  } else if (size === "xl" && link === "none") {
    return (
      <div className="flex justify-center items-center">
        <button
          className={`px-[2vw] py-2.5 text-[1.5vw] ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-full hover:text-black cursor-pointer`}
        >
          <p>{text}</p>
        </button>
      </div>
    );

    //! LG Size
  } else if (size === "lg" && link !== "none") {
    return (
      <div className="flex justify-center items-center">
        <button
          className={`flex items-center h-[3vw] px-[${width ? width : 2}vw] py-3 text-${textSize ? textSize : "[1.2vw]"} ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-full hover:text-black cursor-pointer`}
        >
          <Link href={link}>{text}</Link>
        </button>
      </div>
    );
  } else if (size === "lg" && link === "none") {
    return (
      <div className="flex justify-center items-center">
        <button
          className={`flex items-center h-[3vw] px-[${width ? width : 2}vw] py-3 text-${textSize ? textSize : "[1.2vw]"} ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-full hover:text-black cursor-pointer`}
        >
          <p>{text}</p>
        </button>
      </div>
    );

    //! SM Size
  } else if (size === "sm" && link !== "none") {
    return (
      <div className="flex justify-center items-center">
        <button
          className={`flex items-center h-[2vw] px-[${width ? width : 1}vw] py-2 text-${textSize ? textSize : "[1vw]"} ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-full hover:text-black cursor-pointer`}
        >
          <Link href={link}>{text}</Link>
        </button>
      </div>
    );
  } else if (size === "sm" && link === "none") {
    return (
      <div className="flex justify-center items-center">
        <button
          className={`flex items-center h-[2vw] px-[${width ? width : 1}vw] py-2 text-${textSize ? textSize : "[1vw]"} ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-full hover:text-black cursor-pointer`}
        >
          <p>{text}</p>
        </button>
      </div>
    );

    //! MOBILE-XL Size
  } else if (size === "mobile-xl") {
    return (
      <button
        className={`px-[4vw] py-2.5 ${color === "red" ? red : color === "green" ? green : color === "blue" ? blue : color === "grey" ? grey : blue} text-white rounded-3xl hover:text-black cursor-pointer`}
      >
        <Link href={link}>{text}</Link>
      </button>
    );
  }
}
