import Hero from "./components/Homepage/Hero";
import SectionAddr from "./components/Homepage/SectionAddr";

export default function HomePage() {
  return (
    <div className="min-h-[70vh] overflow-hidden bg-transparent">
      <Hero />
      <SectionAddr />
    </div>
  );
}
