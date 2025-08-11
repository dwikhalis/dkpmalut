import Image from "next/image";
import Link from "next/link";

export default function page() {
  return (
    <>
      <div className="flex items-center justify-center h-[80vh] relative">
        <Image
          src="/assets/404_bg.png"
          alt="Background"
          width={800}
          height={600}
          className="absolute w-auto h-full"
          priority
          quality={100}
        />
        <div className="text-center relative z-10">
          <p className="text-9xl font-bold">404</p>
          <p className="mt-4 text-xl text-gray-600">
            Halaman yang anda cari tidak tersedia
          </p>
          <Link
            href="/"
            className="mt-6 p-3 inline-block hover:bg-stone-700 bg-black text-white rounded-xl"
          >
            Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </>
  );
}
