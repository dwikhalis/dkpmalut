import "./globals.css";

import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AuthProvider from "./Auth/AuthProvider";
import { Metadata } from "next";
import AuthWatcher from "./Auth/AuthWatcher";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // adjust weights as needed
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "DKP Malut",
  description: "Dinas Kelautan dan Perikanan Provinsi Maluku Utara",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${poppins.variable} antialiased`}
    >
      <body>
        <Analytics />
        <AuthWatcher>
          <AuthProvider>
            <Navbar />
            {children}
            <Footer />
          </AuthProvider>
        </AuthWatcher>
      </body>
    </html>
  );
}
