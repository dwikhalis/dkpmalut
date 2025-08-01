import Link from "next/link";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export default function page() {
  return (
    <>
      <Navbar />
      <div className="flex items-center justify-center h-[80vh] bg-white">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-red-600">404</h1>
          <p className="mt-4 text-xl text-gray-600">Page not found</p>
          <Link
            href="/"
            className="mt-6 inline-block text-blue-500 hover:underline"
          >
            Go back home
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
