import { AuthProvider, useAuth } from "../auth";
import LoginPage from "../login-page";
import OperationsApp from "../operations-app";
import { DEFAULT_VIEW, SLUG_TO_VIEW } from "../view-routes";
import type { View } from "../operations-shell";
import AppRoot from "./app-root";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  const initialView: View = SLUG_TO_VIEW[view] ?? DEFAULT_VIEW;
  return <AppRoot initialView={initialView} />;
}

