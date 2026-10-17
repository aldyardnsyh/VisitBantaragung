import "server-only";
import { ADMIN } from "./config";

const API = "https://api.github.com";

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export interface RepoRef {
  owner: string;
  repo: string;
}

export function splitRepo(slug: string): RepoRef {
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) throw new GitHubError(`Repo tidak valid: ${slug}`, 400);
  return { owner, repo };
}

export const CONTENT_REPO = splitRepo(ADMIN.contentRepo);
export const ASSETS_REPO = splitRepo(ADMIN.assetsRepo);

/** Branch yang dipakai untuk repo tertentu. */
function branchFor(repo: RepoRef): string {
  return repo.repo === ASSETS_REPO.repo ? ADMIN.assetsBranch : ADMIN.branch;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  accept?: string;
  raw?: boolean;
}

async function githubFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!ADMIN.token) {
    throw new GitHubError(
      "Token GitHub belum diatur. Tambahkan ADMIN_GITHUB_TOKEN di environment.",
      500
    );
  }
  const res = await fetch(`${API}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${ADMIN.token}`,
      Accept: options.accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "visitbantaragung-cms",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) detail = data.message;
    } catch {
      // biarkan detail default
    }
    throw new GitHubError(`GitHub API ${res.status}: ${detail}`, res.status);
  }

  if (options.raw) return (await res.text()) as unknown as T;
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export interface GitHubFile {
  path: string;
  sha: string;
  content: string;
  size: number;
}

/** Ambil satu berkas teks dari repo konten. */
export async function getContentFile(path: string): Promise<GitHubFile | null> {
  try {
    const data = await githubFetch<{
      sha: string;
      content: string;
      encoding: string;
      size: number;
    }>(
      `/repos/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/contents/${encodeURI(path)}?ref=${ADMIN.branch}`
    );
    const content =
      data.encoding === "base64"
        ? Buffer.from(data.content, "base64").toString("utf8")
        : data.content;
    return { path, sha: data.sha, content, size: data.size };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}

export interface DirEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
}

/** Daftar isi sebuah folder di repo konten. */
export async function listContentDir(path: string): Promise<DirEntry[]> {
  try {
    const clean = path.replace(/^\/+|\/+$/g, "");
    const suffix = clean ? `/${encodeURI(clean)}` : "";
    const data = await githubFetch<DirEntry[]>(
      `/repos/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/contents${suffix}?ref=${ADMIN.branch}`
    );
    if (!Array.isArray(data)) return [];
    return data;
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return [];
    throw error;
  }
}

/** Daftar isi folder di repo aset (untuk pustaka media). */
export async function listAssetDir(path: string): Promise<DirEntry[]> {
  try {
    const clean = path.replace(/^\/+|\/+$/g, "");
    const suffix = clean ? `/${encodeURI(clean)}` : "";
    const data = await githubFetch<DirEntry[]>(
      `/repos/${ASSETS_REPO.owner}/${ASSETS_REPO.repo}/contents${suffix}?ref=${ADMIN.assetsBranch}`
    );
    if (!Array.isArray(data)) return [];
    return data;
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return [];
    throw error;
  }
}

export interface TreeBlob {
  path: string;
  sha: string;
  size: number;
  type: "blob";
}

interface RawTree {
  tree: Array<{ path: string; sha: string; size?: number; type: string }>;
  truncated: boolean;
}

/**
 * Ambil seluruh daftar berkas repo konten dalam SATU panggilan.
 * Dipakai untuk enumerasi cepat (daftar artikel, cek slug) tanpa membaca
 * berkas satu per satu.
 */
export async function getContentTree(): Promise<TreeBlob[]> {
  const head = await getBranchHead(CONTENT_REPO);
  const data = await githubFetch<RawTree>(
    `/repos/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/git/trees/${head.treeSha}?recursive=1`
  );
  return data.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0,
      type: "blob" as const,
    }));
}

/**
 * Baca isi berkas teks dari raw.githubusercontent.com.
 * Tidak memakan kuota REST API dan jauh lebih cepat untuk daftar panjang.
 */
export async function readRawFile(path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/${ADMIN.branch}/${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export interface FileChange {
  /** Path relatif terhadap root repo, mis. content/wisata/batu-asahan.json */
  path: string;
  /** Isi teks (UTF-8). */
  content?: string;
  /** Isi biner (gambar). */
  base64?: string;
  /** true = hapus berkas ini. */
  remove?: boolean;
}

interface TreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string | null;
}

async function getBranchHead(repo: RepoRef): Promise<{ commitSha: string; treeSha: string }> {
  const ref = await githubFetch<{ object: { sha: string } }>(
    `/repos/${repo.owner}/${repo.repo}/git/ref/heads/${branchFor(repo)}`
  );
  const commitSha = ref.object.sha;
  const commit = await githubFetch<{ tree: { sha: string } }>(
    `/repos/${repo.owner}/${repo.repo}/git/commits/${commitSha}`
  );
  return { commitSha, treeSha: commit.tree.sha };
}

async function createBlob(repo: RepoRef, content: string, base64: boolean): Promise<string> {
  const blob = await githubFetch<{ sha: string }>(
    `/repos/${repo.owner}/${repo.repo}/git/blobs`,
    {
      method: "POST",
      body: base64
        ? { content, encoding: "base64" }
        : { content: Buffer.from(content, "utf8").toString("base64"), encoding: "base64" },
    }
  );
  return blob.sha;
}

/**
 * Commit banyak berkas dalam SATU commit memakai Git Data API.
 * Satu commit = satu build Vercel, jadi ini penting untuk kuota Hobby.
 */
export async function commitFiles(
  repo: RepoRef,
  changes: FileChange[],
  message: string
): Promise<{ commitSha: string; url: string }> {
  if (!changes.length) throw new GitHubError("Tidak ada perubahan untuk di-commit.", 400);

  const maxAttempts = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { commitSha: baseSha, treeSha: baseTree } = await getBranchHead(repo);

      const tree: TreeEntry[] = [];
      for (const change of changes) {
        if (change.remove) {
          tree.push({ path: change.path, mode: "100644", type: "blob", sha: null });
          continue;
        }
        if (change.base64) {
          const sha = await createBlob(repo, change.base64, true);
          tree.push({ path: change.path, mode: "100644", type: "blob", sha });
          continue;
        }
        if (typeof change.content === "string") {
          const sha = await createBlob(repo, change.content, false);
          tree.push({ path: change.path, mode: "100644", type: "blob", sha });
          continue;
        }
        throw new GitHubError(`Perubahan tanpa isi: ${change.path}`, 400);
      }

      const newTree = await githubFetch<{ sha: string }>(
        `/repos/${repo.owner}/${repo.repo}/git/trees`,
        {
          method: "POST",
          // base_tree WAJIB: tanpa ini semua berkas lain ikut terhapus.
          body: { base_tree: baseTree, tree },
        }
      );

      const author = ADMIN.commitEmail
        ? { name: ADMIN.commitName, email: ADMIN.commitEmail }
        : undefined;

      const commit = await githubFetch<{ sha: string; html_url: string }>(
        `/repos/${repo.owner}/${repo.repo}/git/commits`,
        {
          method: "POST",
          body: {
            message,
            tree: newTree.sha,
            parents: [baseSha],
            ...(author ? { author, committer: author } : {}),
          },
        }
      );

      await githubFetch(
        `/repos/${repo.owner}/${repo.repo}/git/refs/heads/${branchFor(repo)}`,
        { method: "PATCH", body: { sha: commit.sha, force: false } }
      );

      return { commitSha: commit.sha, url: commit.html_url };
    } catch (error) {
      lastError = error;
      const status = error instanceof GitHubError ? error.status : 0;
      // 409/422 = ref bergerak (crawler push bersamaan). Coba ulang dari awal.
      if ((status === 409 || status === 422) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new GitHubError("Gagal commit setelah beberapa percobaan.", 500);
}

export async function commitContentFiles(changes: FileChange[], message: string) {
  return commitFiles(CONTENT_REPO, changes, message);
}

export async function commitAssetFiles(changes: FileChange[], message: string) {
  return commitFiles(ASSETS_REPO, changes, message);
}

export interface RateLimit {
  remaining: number;
  limit: number;
  resetAt: string;
}

export async function getRateLimit(): Promise<RateLimit | null> {
  try {
    const res = await fetch(`${API}/rate_limit`, {
      headers: {
        Authorization: `Bearer ${ADMIN.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "visitbantaragung-cms",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      resources: { core: { remaining: number; limit: number; reset: number } };
    };
    const core = data.resources?.core;
    if (!core) return null;
    return {
      remaining: core.remaining,
      limit: core.limit,
      resetAt: new Date(core.reset * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export interface CommitInfo {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  htmlUrl: string;
}

/** Beberapa commit terakhir di branch konten (untuk riwayat perubahan). */
export async function listRecentCommits(limit = 8): Promise<CommitInfo[]> {
  try {
    const data = await githubFetch<
      Array<{
        sha: string;
        html_url: string;
        commit: { message: string; author: { name: string; date: string } | null };
      }>
    >(
      `/repos/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/commits?sha=${ADMIN.branch}&per_page=${limit}`
    );
    return data.map((item) => ({
      sha: item.sha.slice(0, 7),
      message: item.commit.message.split("\n")[0],
      authorName: item.commit.author?.name ?? "Tidak diketahui",
      date: item.commit.author?.date ?? "",
      htmlUrl: item.html_url,
    }));
  } catch {
    return [];
  }
}

/** Jalankan workflow crawler berita secara manual. */export async function dispatchWorkflow(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API}/repos/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/actions/workflows/${ADMIN.syncWorkflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "visitbantaragung-cms",
      },
      body: JSON.stringify({ ref: ADMIN.branch }),
      cache: "no-store",
    }
  );

  if (res.status === 204) {
    return { ok: true, message: "Sinkronisasi berita dimulai. Hasilnya muncul beberapa menit lagi." };
  }

  let detail = res.statusText;
  try {
    const data = (await res.json()) as { message?: string };
    if (data?.message) detail = data.message;
  } catch {
    // abaikan
  }

  if (res.status === 403 || res.status === 404) {
    return {
      ok: false,
      message:
        "Token GitHub tidak punya izin Actions. Tambahkan permission 'Actions: Read and write' pada token.",
    };
  }
  return { ok: false, message: `Gagal memulai sinkronisasi: ${detail}` };
}

/** Ambil status run terakhir dari workflow crawler. */
export async function getLatestWorkflowRun(): Promise<{
  status: string;
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
  event: string;
} | null> {
  try {
    const data = await githubFetch<{
      workflow_runs: Array<{
        status: string;
        conclusion: string | null;
        created_at: string;
        html_url: string;
        event: string;
      }>;
    }>(
      `/repos/${CONTENT_REPO.owner}/${CONTENT_REPO.repo}/actions/workflows/${ADMIN.syncWorkflow}/runs?per_page=1`
    );
    const run = data.workflow_runs?.[0];
    if (!run) return null;
    return {
      status: run.status,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      htmlUrl: run.html_url,
      event: run.event,
    };
  } catch {
    return null;
  }
}
