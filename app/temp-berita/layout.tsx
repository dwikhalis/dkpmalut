import "../globals.css";

export const metadata = {
  title: "Berita",
  description: "Berita DKP Malut",
  keyword: "Berita, News, DKP, Malut,",
  author: "DKP Malut",
};

export default function Page({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
