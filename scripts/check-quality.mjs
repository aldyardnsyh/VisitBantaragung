// Verifikasi kualitas: bandingkan gambar asli vs WebP hasil konversi.
import sharp from "sharp";
import { statSync } from "node:fs";

const samples = [
  "../visitbantaragung-assets/galeri/curug-cipeuteuy.png",
  "../visitbantaragung-assets/galeri/workshop-jamu.png",
  "../visitbantaragung-assets/b2h/katalog-tanaman/bangle/cover.png",
  "../visitbantaragung-assets/bic/artikel/awan-air/cover.png",
];

for (const file of samples) {
  try {
    const meta = await sharp(file).metadata();
    const before = statSync(file).size;
    const buf = await sharp(file, { failOn: "none" })
      .resize({ width: Math.min(meta.width, 1920), withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    const outMeta = await sharp(buf).metadata();
    console.log(`${file.split("/").pop()}`);
    console.log(`  Dimensi : ${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height}`);
    console.log(`  Ukuran  : ${Math.round(before / 1024)} KB -> ${Math.round(buf.length / 1024)} KB (-${Math.round((1 - buf.length / before) * 100)}%)`);
    console.log(`  Format  : ${meta.format} -> ${outMeta.format}`);
    console.log(`  Alpha   : ${meta.hasAlpha ? "ya" : "tidak"} -> ${outMeta.hasAlpha ? "ya" : "tidak"}`);
    console.log("");
  } catch (e) {
    console.log(`${file}: GAGAL - ${e.message}`);
  }
}
