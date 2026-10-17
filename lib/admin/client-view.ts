import "server-only";
import { CollectionDef } from "./collections";
import type { ClientCollection, ClientField } from "@/app/admin/_components/ContentForm";

/** Ubah definisi koleksi server menjadi bentuk yang aman dikirim ke klien. */
export function toClientCollection(collection: CollectionDef): ClientCollection {
  return {
    id: collection.id,
    label: collection.label,
    labelSingular: collection.labelSingular,
    slugKey: collection.slugKey,
    titleKey: collection.titleKey,
    lockedFields: collection.lockedFields ?? [],
    assetPrefix: collection.assetPrefix,
    assetTarget: collection.assetTarget,
    hasDate: Boolean(collection.dateKey),
    fields: collection.fields.map(
      (field): ClientField => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        help: field.help,
        placeholder: field.placeholder,
        options: field.options,
        rows: field.rows,
        maxLength: field.maxLength,
      })
    ),
  };
}

export interface ListCollectionInfo {
  id: string;
  label: string;
  labelSingular: string;
  description: string;
  hasDate: boolean;
  canCreate: boolean;
}

export function toListInfo(collection: CollectionDef): ListCollectionInfo {
  return {
    id: collection.id,
    label: collection.label,
    labelSingular: collection.labelSingular,
    description: collection.description,
    hasDate: Boolean(collection.dateKey),
    canCreate: !collection.readOnlyCreate,
  };
}

/** Folder gambar default untuk entri baru maupun yang sudah ada. */
export function mediaFolderFor(collection: CollectionDef, slug: string): string {
  if (collection.assetTarget === "local") return `${collection.assetPrefix}/${slug}`;
  return `${collection.assetPrefix}/${slug}`;
}
