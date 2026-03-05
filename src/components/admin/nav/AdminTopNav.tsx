import { useNavigate } from "react-router-dom";
import { clearToken } from "../../../auth/tokenManager";

type AdminTopNavProps = {
  title: string;
};

export default function AdminTopNav({ title }: AdminTopNavProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // clear auth state here
    clearToken();
    navigate("/auth/login", { replace: true });
  };

  return (
    <header
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid #e5e5e5",
        backgroundColor: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
      <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>

      <button
        onClick={handleLogout}
        style={{
          padding: "6px 14px",
          border: "1px solid #dc3545",
          backgroundColor: "#dc3545",
          color: "#fff",
          borderRadius: 4,
          cursor: "pointer",
        }}>
        Logout
      </button>
    </header>
  );
}
