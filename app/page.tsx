"use client";

import { AuthProvider, useAuth } from "./auth";
import LoginPage from "./login-page";
import OperationsApp from "./operations-app";

function AppRoot() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <OperationsApp /> : <LoginPage />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
