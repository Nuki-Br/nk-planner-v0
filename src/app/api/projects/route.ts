import { withOrg } from "@/lib/api/handler";
import { listProjects } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listProjects(org));
}
