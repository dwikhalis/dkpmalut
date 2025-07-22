import React from "react";

export default function SectionFive() {
  return (
    <div className="flex flex-col gap-6 py-12 mx-12 justify-center items-center">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">DATA</h2>
        <h5 className="text-center">
          Kanal Data Kelautan dan Perikanan Maluku Utara
        </h5>
      </div>

      <div className="flex justify-center gap-6 flex-wrap mb-6">
        {/* //! BUTTON 1 */}
        <button
          className="flex justify-center items-center bg-white rounded-xl gap-3 p-3 hover:shadow-xl"
          style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
        >
          <div className="rounded-lg bg-stone-300 p-3">
            <img src="./assets/icon_folder_1.png" className="h-5 w-5" />
          </div>
          <h5 className="flex font-bold justify-center items-center gap-6">
            Perikanan Tangkap
            <span className="text-xl text-stone-800">&#10095;</span>
          </h5>
        </button>

        {/* //! BUTTON 2 */}
        <button
          className="flex justify-center items-center bg-white rounded-xl gap-3 p-3 hover:shadow-xl"
          style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
        >
          <div className="rounded-lg bg-stone-300 p-3">
            <img src="./assets/icon_folder_1.png" className="h-5 w-5" />
          </div>
          <h5 className="flex font-bold justify-center items-center gap-6">
            Budidaya
            <span className="text-xl text-stone-800">&#10095;</span>
          </h5>
        </button>

        {/* //! BUTTON 3 */}
        <button
          className="flex justify-center items-center bg-white rounded-xl gap-3 p-3 hover:shadow-xl"
          style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
        >
          <div className="rounded-lg bg-stone-300 p-3">
            <img src="./assets/icon_folder_1.png" className="h-5 w-5" />
          </div>
          <h5 className="flex font-bold justify-center items-center gap-6">
            Pemanfaatan Ruang Laut
            <span className="text-xl text-stone-800">&#10095;</span>
          </h5>
        </button>
      </div>

      <div>
        {/* //! Button "Lainnya" Disabled */}
        {/* <button className="px-7 py-3 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
          <h5>Lainnya</h5>
        </button> */}
      </div>
    </div>
  );
}
