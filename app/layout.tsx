import "./globals.css";

import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import AuthProvider from "./Auth/AuthProvider";
import AuthWatcher from "./Auth/AuthWatcher";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Platform Data DKP Maluku Utara",
  description:
    "Platform data kelautan dan perikanan Provinsi Maluku Utara.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="antialiased">
      <body>
        <SpeedInsights />
        <Analytics />
        <AuthWatcher>
          <AuthProvider>
            <Navbar />
            <main className="min-h-[70vh] bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </AuthWatcher>
      </body>
    </html>
  );
}
