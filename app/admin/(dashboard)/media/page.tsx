import { MEDIA_FOLDERS } from "@/lib/admin/config";
import MediaClient from "./MediaClient";

export const dynamic = "force-dynamic";

export default function MediaPage() {
  return <MediaClient folders={[...MEDIA_FOLDERS]} />;
}
