import { redirect } from "next/navigation";

export default function RootPage() {
  // Planner entry point is the dashboard. Auth-gating is added in Phase 5.
  redirect("/dashboard");
}
