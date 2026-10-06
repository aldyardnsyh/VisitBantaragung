import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));

// Audit diri: memastikan file yang akan di-commit bebas anomali.
// Dipakai karena keluaran authoring manual juga bisa tercemar, sama seperti
// keluaran model. Jalankan sebelum commit: node scripts/audit-self.mjs
//
// Hanya memeriksa file TEKS. Pola sengaja spesifik supaya tidak bising.

const POLA = [
  { re: /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g, nama: "aksara CJK" },
  { re: /[ßẞɓƀḍȷǀǁɠ]/g, nama: "huruf non-Indonesia" },
  { re: /\b[a-z]{2,}_[a-zA-Z_]{2,}\b/g, nama: "kata ber-underscore" },
  { re: /[A-Za-z]=[A-Za-z]{1,3}\b(?![=>])/g, nama: "sama-dengan nyasar" },
  { re: /\b(?:sorry|let me|as an ai|the clean final json|json output)\b/i, nama: "meta model" },
];

// File generated tidak diaudit (isinya bukan tulisan).
const ABAIKAN_FILE = /(^|\/)package-lock\.json$|\.min\.(js|css)$/;
// Pola underscore/sama-dengan hanya relevan untuk file konten (.json/.md);
// di file kode itu konstruksi sah (id_ID, summary_large_image, ${...}).
const HANYA_KONTEN = /\.(json|md)$/;
const DILEWARKAN = new Set([
  "@/lib/content", "@/lib/asset", "@/lib/jsonld", "@/app/components",
]);

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(js|ts|tsx|json|md|yml|css)$/.test(f));

const temuan = [];

for (const f of files) {
  if (ABAIKAN_FILE.test(f)) continue;
  if (!fs.existsSync(f)) continue;
  const isi = fs.readFileSync(f, "utf8");
  isi.split("\n").forEach((baris, i) => {
    if (DILEWARKAN.has(baris.trim())) return;
    // Pengecualian eksplisit: definisi pola detektor & fixture sampel JELEK
    // yang disengaja (ditandai audit-skip di ujung baris).
    if (baris.includes("audit-skip")) return;
    // URL dan handle @... bukan kata sampah (mis. link vercel, handle instagram).
    const tanpaUrl = baris.replace(/https?:\/\/\S+/g, " ").replace(/@\w+/g, " ");
    // Assignment env (LLM_MODEL=..., CHARSET=...) bukan simbol nyasar.
    const tanpaEnv = baris.replace(/\b[A-Z][A-Z0-9_]*=[^\s]*/g, " ");
    for (const { re, nama } of POLA) {
      if ((nama === "kata ber-underscore" || nama === "sama-dengan nyasar") && !HANYA_KONTEN.test(f)) continue;
      const sumber = nama === "kata ber-underscore" ? tanpaUrl : nama === "sama-dengan nyasar" ? tanpaEnv : baris;
      const cocok = sumber.match(re);
      if (!cocok) continue;
      // Kata kunci teknis sah yang memang ber-underscore.
      if (nama === "kata ber-underscore" && /workflow_dispatch|getServer|use_client|use_state|node_modules/.test(baris)) continue;
      temuan.push({ f, baris: i + 1, nama, teks: baris.trim().slice(0, 90) });
    }
  });
}

if (!temuan.length) {
  console.log("audit-self: bersih, 0 anomali di " + files.length + " file");
  process.exit(0);
}

console.log("audit-self: " + temuan.length + " anomali\n");
for (const t of temuan.slice(0, 30)) {
  console.log("  " + t.f + ":" + t.baris + "  [" + t.nama + "]");
  console.log("     " + t.teks);
}
if (temuan.length > 30) console.log("  ... " + (temuan.length - 30) + " lagi");
process.exit(1);
