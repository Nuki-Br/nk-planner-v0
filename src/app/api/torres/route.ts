import { withOrg } from "@/lib/api/handler";
import { listTorres } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listTorres(org));
}
