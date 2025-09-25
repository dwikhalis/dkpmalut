import Link from "next/link";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";

export default function Footer() {
  return (
    <>
      {/* //! DESKTOP */}
      <div className="hidden md:flex justify-between py-12 lg:px-24 px-12 bg-sky-900 w-full">
        {/* LEFT SIDE */}
        <div className="w-[50%]">
          <h6 className="text-white">© 2025 DKP Malut. All right reserved.</h6>
          <Link href="https://www.linkedin.com/in/khalisdwih/">
            <h6 className="text-white">Design and build by Khalis</h6>
          </Link>
          <br />
          <div className="flex h-10 gap-4 items-center">
            <Link
              href="#"
              className="text-stone-600 hover:text-blue-700 text-2xl"
            >
              <FaFacebook className="text-white" />
            </Link>
            <Link
              href="#"
              className="text-stone-600 hover:text-pink-700 text-2xl"
            >
              <FaInstagram className="text-white" />
            </Link>
            <Link
              href="#"
              className="text-stone-600 hover:text-red-700 text-2xl"
            >
              <FaYoutube className="text-white" />
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex w-[50%] justify-between text-white">
          {/* COL 1 */}
          <div className="flex flex-col gap-2">
            <h6 className="font-bold">Organisasi</h6>
            <Link
              href={"/Organisasi"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Struktur</h6>
            </Link>
            <Link
              href={"/Organisasi"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Visi dan Misi</h6>
            </Link>
            <Link
              href={"/Kontak"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Kontak</h6>
            </Link>
          </div>

          {/* COL 2 */}

          <div className="flex flex-col gap-2">
            <h6 className="font-bold">Berita</h6>
            <Link
              href={"/Berita"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Artikel</h6>
            </Link>
            <Link
              href={"/Berita"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Jurnal</h6>
            </Link>
            <Link
              href={"/Berita"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Peraturan</h6>
            </Link>
          </div>

          {/* COL 3 */}
          <div className="flex flex-col gap-2">
            <h6 className="font-bold">Data</h6>
            <Link
              href={"/Data"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Perikanan Tangkap</h6>
            </Link>
            <Link
              href={"/Data"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Perikanan Budidaya</h6>
            </Link>
            <Link
              href={"/Data"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Ruang Laut</h6>
            </Link>
          </div>
        </div>
      </div>

      {/* //! MOBILE */}
      <div className="md:hidden px-12 py-6 bg-sky-900 w-full text-white">
        {/* LEFT SIDE */}
        <div className="flex justify-between">
          {/* COL 1 */}
          <div className="flex flex-col gap-2 text-center">
            <h6 className="font-bold">Organisasi</h6>
            <Link
              href={"/Organisasi"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Struktur</h6>
            </Link>
            <Link
              href={"/Organisasi"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Visi dan Misi</h6>
            </Link>
            <Link
              href={"/Kontak"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Kontak</h6>
            </Link>
          </div>

          {/* COL 2 */}
          <div className="flex flex-col gap-2 text-center">
            <h6 className="font-bold">Berita</h6>
            <Link
              href={"/Berita"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Artikel</h6>
            </Link>
            <Link
              href={"/Berita"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Jurnal</h6>
            </Link>
            <Link
              href={"/Berita"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Peraturan</h6>
            </Link>
          </div>

          {/* COL 3 */}
          <div className="flex flex-col gap-2 text-center">
            <h6 className="font-bold">Data</h6>
            <Link
              href={"/Data"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Perikanan Tangkap</h6>
            </Link>
            <Link
              href={"/Data"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Perikanan Budidaya</h6>
            </Link>
            <Link
              href={"/Data"}
              className="hover:text-stone-400 cursor-pointer"
            >
              <h6>Ruang Laut</h6>
            </Link>
          </div>
        </div>

        <div className="pt-6">
          {/* Middle */}
          <div className="flex h-10 gap-4 items-center justify-center">
            <Link
              href="#"
              className="text-stone-600 hover:text-blue-700 text-2xl"
            >
              <FaFacebook className="text-white" />
            </Link>
            <Link
              href="#"
              className="text-stone-600 hover:text-pink-700 text-2xl"
            >
              <FaInstagram className="text-white" />
            </Link>
            <Link
              href="#"
              className="text-stone-600 hover:text-red-700 text-2xl"
            >
              <FaYoutube className="text-white" />
            </Link>
          </div>

          {/* BOTTOM SIDE */}
          <h6 className="text-center mt-3">
            © 2025 DKP Malut. All rights reserved.
          </h6>
          <Link href="https://www.linkedin.com/in/khalisdwih/">
            <h6 className="text-center">Design and build by Khalis</h6>
          </Link>
        </div>
      </div>
    </>
  );
}
