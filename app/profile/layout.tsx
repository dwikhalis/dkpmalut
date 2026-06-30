import AuthProtect from "../Auth/AuthProtect";
import "../globals.css";

export default function Page({ children }: { children: React.ReactNode }) {
  return <AuthProtect>{children}</AuthProtect>;
}
