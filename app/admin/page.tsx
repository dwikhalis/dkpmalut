import AdminDashboard from "../components/AdminDashboard";
import AdminSideMenu from "../components/AdminSideMenu";

export default function Page() {
  return (
    <div className="flex">
      <AdminSideMenu slug="home" />
      <div className="flex h-full w-full lg:mx-12 mx-8 min-h-[70vh]">
        <AdminDashboard />
      </div>
    </div>
  );
}
