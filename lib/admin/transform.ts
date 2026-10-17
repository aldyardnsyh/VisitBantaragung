import { CollectionDef, FieldDef } from "./collections";

// Terjemahan antara bentuk JSON di repo dan bentuk datar yang dipakai form.
//
// Beberapa koleksi menyimpan data bersarang (location.lat, contact.whatsapp).
// Form memakai kunci datar (lat, whatsapp) agar sederhana, lalu dikembalikan
// ke bentuk bersarang saat disimpan. Data lama yang bentuknya berbeda tetap
// dipertahankan lewat merge.

// Nilai form selalu berupa teks atau daftar teks: angka dikonversi ke teks saat
// dibaca dan dikembalikan ke angka saat disimpan. Ini menjaga form sederhana
// sekaligus mempertahankan tipe asli pada JSON.
export type FormValues = Record<string, string | string[]>;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Ubah JSON tersimpan menjadi nilai form yang datar. */
export function recordToFormValues(
  collection: CollectionDef,
  record: Record<string, unknown>
): FormValues {
  const values: FormValues = {};

  for (const field of collection.fields) {
    const raw = readField(record, collection, field);
    switch (field.type) {
      case "list":
      case "paragraphs":
        values[field.key] = asStringArray(raw).join("\n");
        break;
      case "tags":
        values[field.key] = asStringArray(raw);
        break;
      case "gallery":
        values[field.key] = asStringArray(raw);
        break;
      case "number": {
        if (typeof raw === "number") values[field.key] = String(raw);
        else if (typeof raw === "string") values[field.key] = raw;
        else values[field.key] = "";
        break;
      }
      case "boolean":
        values[field.key] = raw === true ? "true" : raw === false ? "false" : "";
        break;
      default:
        values[field.key] = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
    }
  }

  return values;
}

function readField(
  record: Record<string, unknown>,
  collection: CollectionDef,
  field: FieldDef
): unknown {
  // Kunci bersarang khusus per koleksi.
  if (collection.id === "wisata" && (field.key === "lat" || field.key === "lng")) {
    const loc = record.location as { lat?: unknown; lng?: unknown } | undefined;
    return field.key === "lat" ? loc?.lat : loc?.lng;
  }
  if (collection.id === "homestay") {
    const contact = record.contact as { whatsapp?: unknown; email?: unknown } | undefined;
    if (field.key === "whatsapp") return contact?.whatsapp;
    if (field.key === "email") return contact?.email;
  }
  if (collection.id === "umkm" && field.key === "whatsapp") {
    const contact = record.contact as { whatsapp?: unknown } | undefined;
    return contact?.whatsapp;
  }
  return record[field.key];
}

/** Ubah nilai form kembali menjadi field JSON siap simpan. */
export function formValuesToRecord(
  collection: CollectionDef,
  values: FormValues
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const field of collection.fields) {
    const value = values[field.key];

    switch (field.type) {
      case "list":
      case "paragraphs": {
        const lines = splitLines(value);
        out[field.key] = lines;
        break;
      }
      case "tags":
      case "gallery": {
        const items = normalizeStringArray(value);
        out[field.key] = items;
        break;
      }
      case "number": {
        const num = toNumber(value);
        if (num !== undefined) out[field.key] = num;
        break;
      }
      case "boolean": {
        if (value === "true") out[field.key] = true;
        else if (value === "false") out[field.key] = false;
        break;
      }
      case "whatsapp": {
        const text = normalizeString(value);
        if (collection.id === "homestay") {
          out.contact = { ...(out.contact as object), whatsapp: text };
        } else if (collection.id === "umkm") {
          out.contact = { whatsapp: text };
        } else {
          out[field.key] = text;
        }
        break;
      }
      default: {
        const text = normalizeString(value);
        if (text !== undefined) out[field.key] = text;
      }
    }
  }

  // Field gabungan khusus: wisata menyimpan lat/lng di dalam objek location.
  if (collection.id === "wisata") {
    const lat = toNumber(values.lat);
    const lng = toNumber(values.lng);
    delete out.lat;
    delete out.lng;
    if (lat !== undefined || lng !== undefined) {
      out.location = {
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
      };
    }
  }

  if (collection.id === "homestay") {
    const existing = (out.contact as Record<string, unknown>) ?? {};
    const email = normalizeString(values.email);
    if (email !== undefined && email !== "") existing.email = email;
    else if (email === "") delete existing.email;
    if (Object.keys(existing).length) out.contact = existing;
    else delete out.contact;
    // email bukan kunci langsung pada homestay.
    delete out.email;
  }

  return out;
}

function splitLines(value: unknown): string[] {
  const text = typeof value === "string" ? value : "";
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value.replace(",", "."));
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

/** Validasi nilai form terhadap definisi field. */
export function validateFormValues(
  collection: CollectionDef,
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of collection.fields) {
    if (collection.readOnlyCreate && collection.lockedFields?.includes(field.key)) continue;
    const value = values[field.key];
    const isEmpty =
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "string" && value.trim() === "");

    if (field.required && isEmpty) {
      errors[field.key] = "Kolom ini wajib diisi.";
      continue;
    }
    if (isEmpty) continue;

    if (field.maxLength && typeof value === "string" && value.length > field.maxLength) {
      errors[field.key] = `Maksimal ${field.maxLength} karakter.`;
    }

    if (field.key === "slug" && typeof value === "string") {
      if (/[/\\]/.test(value) || value.includes("..")) {
        errors[field.key] = "Slug tidak boleh berisi garis miring atau titik ganda.";
      } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(value)) {
        errors[field.key] = "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.";
      }
    }

    if (field.type === "number") {
      const num = Number(String(value).replace(",", "."));
      if (!Number.isFinite(num)) {
        errors[field.key] = "Isi dengan angka.";
      } else if (field.key === "lat" && (num < -90 || num > 90)) {
        errors[field.key] = "Lintang harus antara -90 dan 90.";
      } else if (field.key === "lng" && (num < -180 || num > 180)) {
        errors[field.key] = "Bujur harus antara -180 dan 180.";
      }
    }

    if (field.type === "whatsapp" && typeof value === "string") {
      const digits = value.replace(/[^0-9]/g, "");
      if (!/^62\d{8,14}$/.test(digits)) {
        errors[field.key] = "Gunakan format 62 diikuti nomor, mis. 6281234567890.";
      }
    }
  }

  return errors;
}
