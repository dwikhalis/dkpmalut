import Link from "next/link";
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  const socmed_facebook = "#";
  const socmed_instagram = "#";
  const socmed_youtube = "#";
  const socmed_xtwitter = "";
  const socmed_tiktok = "";

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
            {socmed_facebook && (
              <Link href={socmed_facebook}>
                <FaFacebook className="text-white" />
              </Link>
            )}
            {socmed_instagram && (
              <Link href={socmed_instagram}>
                <FaInstagram className="text-white" />
              </Link>
            )}
            {socmed_youtube && (
              <Link href={socmed_youtube}>
                <FaYoutube className="text-white" />
              </Link>
            )}
            {socmed_xtwitter && (
              <Link href={socmed_xtwitter}>
                <FaXTwitter className="text-white" />
              </Link>
            )}
            {socmed_tiktok && (
              <Link href={socmed_tiktok}>
                <FaTiktok className="text-white" />
              </Link>
            )}
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
            {socmed_facebook && (
              <Link href={socmed_facebook}>
                <FaFacebook className="text-white" />
              </Link>
            )}
            {socmed_instagram && (
              <Link href={socmed_instagram}>
                <FaInstagram className="text-white" />
              </Link>
            )}
            {socmed_youtube && (
              <Link href={socmed_youtube}>
                <FaYoutube className="text-white" />
              </Link>
            )}
            {socmed_xtwitter && (
              <Link href={socmed_xtwitter}>
                <FaXTwitter className="text-white" />
              </Link>
            )}
            {socmed_tiktok && (
              <Link href={socmed_tiktok}>
                <FaTiktok className="text-white" />
              </Link>
            )}
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
