import "./globals.css";

import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AuthProvider from "./Auth/AuthProvider";
import { Metadata } from "next";
import AuthWatcher from "./Auth/AuthWatcher";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    <html lang="id" className="antialiased">
      <body>
        <SpeedInsights />
        <Analytics />
        <AuthWatcher>
          <AuthProvider>
            <Navbar />
            <div className="min-h-[70vh] bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100">
              {children}
            </div>
            <Footer />
          </AuthProvider>
        </AuthWatcher>
      </body>
    </html>
  );
}
