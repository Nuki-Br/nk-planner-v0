import { withOrg } from "@/lib/api/handler";
import { getStorageUsage } from "@/lib/server/media";

/** GET — uso de armazenamento da org. Org sem uso recebe DTO zerado, não 404. */
export async function GET() {
  return withOrg((org) => getStorageUsage(org));
}
