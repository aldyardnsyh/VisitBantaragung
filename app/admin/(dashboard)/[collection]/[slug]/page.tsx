import { notFound } from "next/navigation";
import { getCollection } from "@/lib/admin/collections";
import { mediaFolderFor, toClientCollection } from "@/lib/admin/client-view";
import { getRecord } from "@/lib/admin/service";
import { recordToFormValues } from "@/lib/admin/transform";
import RecordEditor from "@/app/admin/_components/RecordEditor";

export const dynamic = "force-dynamic";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection: id, slug } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();

  const record = await getRecord(collection, decodeURIComponent(slug));
  if (!record) notFound();

  return (
    <RecordEditor
      mode="edit"
      collection={toClientCollection(collection)}
      initialValues={recordToFormValues(collection, record.raw)}
      initialSha={record.sha}
      originalSlug={record.slug}
      mediaFolder={mediaFolderFor(collection, record.slug)}
    />
  );
}
