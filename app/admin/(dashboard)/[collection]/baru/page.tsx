import { notFound } from "next/navigation";
import { getCollection } from "@/lib/admin/collections";
import { mediaFolderFor, toClientCollection } from "@/lib/admin/client-view";
import RecordEditor from "@/app/admin/_components/RecordEditor";
import { FormValues } from "@/lib/admin/transform";

export const dynamic = "force-dynamic";

/** Nilai awal kosong mengikuti definisi field koleksi. */
function emptyValues(collectionId: string, fields: { key: string; type: string }[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.type === "gallery" || field.type === "tags") {
      values[field.key] = [];
    } else if (field.type === "date" && collectionId !== "wisata") {
      values[field.key] = new Date().toISOString().slice(0, 10);
    } else {
      values[field.key] = "";
    }
  }
  return values;
}

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection: id } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();

  if (collection.readOnlyCreate) {
    return (
      <div className="rounded-[12px] border border-adm-border bg-adm-surface p-6">
        <h1 className="text-lg font-semibold text-adm-ink">
          {collection.label} tidak dapat dibuat manual
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-adm-subtle">
          {collection.description}
        </p>
      </div>
    );
  }

  const clientCollection = toClientCollection(collection);

  return (
    <RecordEditor
      mode="create"
      collection={clientCollection}
      initialValues={emptyValues(collection.id, clientCollection.fields)}
      mediaFolder={mediaFolderFor(collection, "baru")}
    />
  );
}
