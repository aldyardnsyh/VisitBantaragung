import { notFound } from "next/navigation";
import { getCollection } from "@/lib/admin/collections";
import { toListInfo } from "@/lib/admin/client-view";
import CollectionList from "@/app/admin/_components/CollectionList";

export const dynamic = "force-dynamic";

/** Halaman daftar generik: dipakai oleh semua koleksi lewat rute /admin/[collection]. */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection: id } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();

  return <CollectionList collection={toListInfo(collection)} />;
}
