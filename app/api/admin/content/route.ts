import { NextRequest } from "next/server";
import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { getCollection } from "@/lib/admin/collections";
import { deleteRecord, getRecord, listRecords, saveRecord } from "@/lib/admin/service";
import { FormValues } from "@/lib/admin/transform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function collectionOrThrow(id: string) {
  const collection = getCollection(id);
  if (!collection) {
    const error = new Error("Koleksi tidak dikenal.") as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  return collection;
}

/** GET /api/admin/content?collection=wisata[&slug=batu-asahan] */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const params = request.nextUrl.searchParams;
    const collection = collectionOrThrow(params.get("collection") ?? "");
    const slug = params.get("slug");

    if (slug) {
      const record = await getRecord(collection, slug);
      if (!record) {
        return jsonOk({ error: "Konten tidak ditemukan." }, { status: 404 });
      }
      return jsonOk({ record });
    }

    const records = await listRecords(collection);
    return jsonOk({ records });
  } catch (error) {
    return jsonError(error);
  }
}

interface SaveBody {
  collection?: string;
  slug?: string;
  newSlug?: string;
  expectedSha?: string;
  values?: FormValues;
}

/** POST /api/admin/content — simpan (buat atau ubah) satu entri. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as SaveBody;
    const collection = collectionOrThrow(body.collection ?? "");

    if (!body.values || typeof body.values !== "object") {
      return jsonOk({ error: "Data formulir tidak dikirim." }, { status: 422 });
    }

    const values: FormValues = { ...body.values };

    // Nilai slug sengaja TIDAK dinormalisasi di sini. Validasi di service harus
    // melihat nilai asli supaya masukan berbahaya ditolak dengan pesan jelas,
    // bukan diam-diam diubah menjadi slug lain.
    const result = await saveRecord(collection, {
      values,
      originalSlug: body.slug,
      newSlug: body.newSlug,
      expectedSha: body.expectedSha,
      username: session.sub,
    });

    return jsonOk({
      ok: true,
      slug: result.slug,
      commitUrl: result.commitUrl,
      warnings: result.warnings,
      message: "Perubahan tersimpan. Situs akan diperbarui dalam 1 sampai 2 menit.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE /api/admin/content?collection=wisata&slug=batu-asahan */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    const collection = collectionOrThrow(params.get("collection") ?? "");
    const slug = params.get("slug");
    if (!slug) return jsonOk({ error: "Slug wajib diisi." }, { status: 422 });

    const result = await deleteRecord(collection, slug, session.sub);
    return jsonOk({
      ok: true,
      commitUrl: result.commitUrl,
      message: "Konten dihapus. Situs akan diperbarui dalam 1 sampai 2 menit.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
