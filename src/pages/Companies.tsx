import { Navigate } from "react-router-dom";

export default function Companies() {
  return <Navigate to="/settings?tab=companies" replace />;
}
