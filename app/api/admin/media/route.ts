import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { deleteMedia, listMedia, uploadMedia, MediaTarget } from "@/lib/admin/service";
import { isMediaFolder } from "@/lib/admin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveTarget(value: string | null): MediaTarget {
  return value === "local" ? "local" : "assets";
}

/**
 * Folder yang boleh menerima unggahan. Untuk repo aset: folder akar yang
 * terdaftar. Untuk repo konten: hanya public/berita (folder berita crawl),
 * sehingga tidak ada berkas lain yang bisa disentuh.
 *
 * Setiap segmen path diperiksa supaya ".." tidak bisa dipakai keluar dari
 * folder yang diizinkan.
 */
function folderAllowed(target: MediaTarget, folder: string): boolean {
  const clean = folder.replace(/^\/+|\/+$/g, "");
  if (!clean) return false;
  const segments = clean.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
  if (!/^[a-zA-Z0-9/_-]+$/.test(clean)) return false;

  const root = segments[0];
  if (target === "local") return root === "berita";
  return isMediaFolder(root);
}

/** 422 untuk parameter kosong, 403 untuk folder di luar izin. */
function rejectFolder(folder: string): Response | null {
  if (!folder) {
    return NextResponse.json({ error: "Folder wajib diisi." }, { status: 422 });
  }
  return null;
}

/** GET /api/admin/media?folder=wisata/batu-asahan&target=assets */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const params = request.nextUrl.searchParams;
    const target = resolveTarget(params.get("target"));
    const folder = (params.get("folder") ?? "").replace(/^\/+|\/+$/g, "");

    const empty = rejectFolder(folder);
    if (empty) return empty;
    if (!folderAllowed(target, folder)) {
      return NextResponse.json({ error: "Folder tidak diizinkan." }, { status: 403 });
    }

    const items = await listMedia(target, folder);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/admin/media — unggah satu gambar (multipart). */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const form = await request.formData();
    const file = form.get("file");
    const target = resolveTarget(String(form.get("target") ?? "assets"));
    const folder = String(form.get("folder") ?? "").replace(/^\/+|\/+$/g, "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas tidak ditemukan pada permintaan." }, { status: 422 });
    }
    const empty = rejectFolder(folder);
    if (empty) return empty;
    if (!folderAllowed(target, folder)) {
      return NextResponse.json({ error: "Folder tidak diizinkan." }, { status: 403 });
    }
    if (file.size > 4_000_000) {
      return NextResponse.json(
        { error: "Ukuran berkas terlalu besar. Maksimal 4 MB setelah dikompresi." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadMedia({
      target,
      folder,
      fileName: file.name || "gambar.jpg",
      base64: buffer.toString("base64"),
      username: session.sub,
    });

    return jsonOk({
      ok: true,
      ...result,
      message: "Gambar diunggah. Situs akan diperbarui dalam 1 sampai 2 menit.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE /api/admin/media?path=wisata/batu-asahan/cover-123.jpg&target=assets */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    const target = resolveTarget(params.get("target"));
    const path = (params.get("path") ?? "").replace(/^\/+/, "");

    if (!path) {
      return NextResponse.json({ error: "Path wajib diisi." }, { status: 422 });
    }
    // Path berkas harus berada di dalam folder yang diizinkan.
    const segments = path.split("/");
    const fileName = segments.pop() ?? "";
    if (!fileName || !folderAllowed(target, segments.join("/"))) {
      return NextResponse.json({ error: "Path tidak diizinkan." }, { status: 403 });
    }

    const result = await deleteMedia(target, path, session.sub);
    return jsonOk({
      ok: true,
      commitUrl: result.commitUrl,
      message: "Gambar dihapus dari repositori.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
