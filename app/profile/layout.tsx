import AuthProtect from "../Auth/AuthProtect";
import "../globals.css";

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <AuthProtect>
      <div className="min-h-[calc(100dvh-12vw)] bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100 md:min-h-[calc(100dvh-4rem)]">
        {children}
      </div>
    </AuthProtect>
  );
}
