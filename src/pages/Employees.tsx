import { Navigate } from "react-router-dom";

export default function Employees() {
  return <Navigate to="/settings?tab=employees" replace />;
}
