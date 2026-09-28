import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

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

// Teks Indonesia/UI yang sah dan tidak boleh dianggap anomali.
const DILEWARKAN = new Set([
  "@/lib/content", "@/lib/asset", "@/lib/jsonld", "@/app/components",
]);

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(js|ts|tsx|json|md|yml|css)$/.test(f));

const temuan = [];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const isi = fs.readFileSync(f, "utf8");
  isi.split("\n").forEach((baris, i) => {
    if (DILEWARKAN.has(baris.trim())) return;
    for (const { re, nama } of POLA) {
      const cocok = baris.match(re);
      if (!cocok) continue;
      // Kata kunci teknis sah yang memang ber-underscore.
      if (nama === "kata ber-underscore" && /workflow_dispatch|getServer|use_client|use_state/.test(baris)) continue;
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
