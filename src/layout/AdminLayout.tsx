import { Outlet } from "react-router-dom";
import DashboardSidebar from "../pages/admin/Dashboard/DashboardSidebar";
import "./AdminLayout.css";

export default function AdminLayout() {

  return (
    <div className="admin-layout">
      <DashboardSidebar />

      <div className="admin-content">
        {/* <AdminTopNav  title={page.toUpperCase()} /> */}

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
