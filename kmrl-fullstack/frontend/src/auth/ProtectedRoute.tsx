// src/auth/ProtectedRoute.tsx

import { Navigate } from "react-router-dom";
import { Loader } from "@/components/Loader";
import { useAuth } from "@/context/AuthProvider";

interface Props {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: Props) => {
  const { status, isAuthenticated } = useAuth();

  if (status === "loading") {
    return <Loader fullScreen message="Checking access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
