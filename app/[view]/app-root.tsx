"use client";

import { AuthProvider, useAuth } from "../auth";
import LoginPage from "../login-page";
import OperationsApp from "../operations-app";
import type { View } from "../operations-shell";

function AuthGate({ initialView }: { initialView: View }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <OperationsApp initialView={initialView} /> : <LoginPage />;
}

export default function AppRoot({ initialView }: { initialView: View }) {
  return (
    <AuthProvider>
      <AuthGate initialView={initialView} />
    </AuthProvider>
  );
}
