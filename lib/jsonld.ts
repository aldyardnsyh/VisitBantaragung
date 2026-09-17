// Serialisasi JSON-LD yang aman disuntik ke <script type="application/ld+json">.
// Alasan: judul/artikel berasal dari WordPress (input luar); tanpa escape, string
// "</script>" di dalam data akan menutup tag script dan menjadi XSS tersimpan.
// Mengganti "<" dengan \u003c netral, valid JSON, dan tanpa biaya runtime berarti.
export function toJsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
