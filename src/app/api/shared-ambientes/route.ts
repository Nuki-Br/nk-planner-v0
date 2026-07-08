import { withOrg } from "@/lib/api/handler";
import { getSharedInfo } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => getSharedInfo(org));
}
