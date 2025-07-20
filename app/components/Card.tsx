import React from "react";

interface Props {
  id: number;
  data: any;
}

export default function Card(props: Props) {
  const { id, data } = props;
  const sel = id - 1;

  const { tag, title, content, image, redirect } = data[sel];

  return (
    <>
      <div className="flex flex-col 2xl:w-[20vw] 2xl:h-150 md:h-130 w-70 h-120 pt-12 px-6 shadow-2xl hover:shadow-xl justify-between rounded-2xl">
        {/* //! CONTENT */}
        <div className="w-full">
          {/* //! IMAGE */}
          <div className="flex justify-center items-center 2xl:h-50 h-50 mb-3 overflow-hidden">
            <img
              src={image}
              alt="Gambar"
              className="object-cover w-full h-full"
            />
          </div>

          {/* //! TAG */}
          <h6 className="text-stone-500 mb-1">{tag}</h6>

          {/* //! TITLE */}

          <h5 className="font-bold">{title}</h5>
        </div>

        {/* //! CTA */}
        <a href={redirect}>
          <h5 className="text-teal-500 hover:text-teal-300 py-6">
            Selengkapnya &rarr;
          </h5>
        </a>
      </div>
    </>
  );
}
