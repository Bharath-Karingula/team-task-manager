import { Navigate } from "react-router-dom";
import { getAccessToken } from "../services/auth";

export default function ProtectedRoute({
  children
}) {

  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;

}
