import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/propostas")({
  component: () => <Outlet />,
});