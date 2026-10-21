"use client";

import { useState } from "react";
import { PageHeader } from "../../_components/Card";
import { Field, Input, Textarea } from "../../_components/Form";
import Button from "../../_components/Button";
import Badge from "../../_components/Badge";
import { useToast } from "../../_components/Toast";
import { apiSend } from "../../_lib/api";

interface SettingsClientProps {
  site: Record<string, unknown>;
  seo: Record<string, unknown>;
  info: {
    contentRepo: string;
    assetsRepo: string;
    branch: string;
    cdnBase: string;
    siteUrl: string;
  };
  config: {
    token: boolean;
    auth: boolean;
    hashedPassword: boolean;
    plainPassword: boolean;
  };
}

export default function SettingsClient({ site, seo, info, config }: SettingsClientProps) {
  const toast = useToast();
  const [tab, setTab] = useState<"situs" | "seo" | "sistem">("situs");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistem"
        title="Pengaturan Situs"
        description="Identitas situs, informasi kontak, dan metadata untuk mesin pencari."
      />

      <div
        role="tablist"
        aria-label="Bagian pengaturan"
        className="inline-flex items-center gap-0.5 rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-surface-2 p-0.5"
      >
        {(
          [
            ["situs", "Identitas & Kontak"],
            ["seo", "SEO"],
            ["sistem", "Sistem"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            onClick={() => setTab(value)}
            aria-selected={tab === value}
            className={`adm-ring adm-transition rounded-[var(--radius-adm-sm)] px-3 py-1.5 text-[12.5px] font-medium ${
              tab === value
                ? "bg-adm-surface text-adm-ink shadow-adm-xs"
                : "text-adm-subtle hover:bg-adm-surface/60 hover:text-adm-ink active:bg-adm-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "situs" ? <SiteForm site={site} onSaved={() => toast.success("Pengaturan situs diperbarui.")} onError={(m) => toast.error(m)} /> : null}
      {tab === "seo" ? <SeoForm seo={seo} onSaved={() => toast.success("Pengaturan SEO diperbarui.")} onError={(m) => toast.error(m)} /> : null}
      {tab === "sistem" ? <SystemInfo info={info} config={config} /> : null}
    </div>
  );
}

function SiteForm({
  site,
  onSaved,
  onError,
}: {
  site: Record<string, unknown>;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const location = (site.location ?? {}) as Record<string, unknown>;
  const contact = (site.contact ?? {}) as Record<string, unknown>;
  const socials = (site.socials ?? {}) as Record<string, unknown>;

  const [values, setValues] = useState({
    siteName: String(site.siteName ?? ""),
    tagline: String(site.tagline ?? ""),
    description: String(site.description ?? ""),
    village: String(location.village ?? ""),
    district: String(location.district ?? ""),
    regency: String(location.regency ?? ""),
    province: String(location.province ?? ""),
    latitude: String(location.latitude ?? ""),
    longitude: String(location.longitude ?? ""),
    address: String(contact.address ?? ""),
    whatsapp: String(contact.whatsapp ?? ""),
    email: String(contact.email ?? ""),
    googleMapsUrl: String(contact.googleMapsUrl ?? ""),
    instagram: String(socials.instagram ?? ""),
    facebook: String(socials.facebook ?? ""),
    youtube: String(socials.youtube ?? ""),
    tiktok: String(socials.tiktok ?? ""),
  });
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiSend("/api/admin/settings", "POST", {
        key: "site",
        values: {
          siteName: values.siteName,
          tagline: values.tagline,
          description: values.description,
          location: {
            village: values.village,
            district: values.district,
            regency: values.regency,
            province: values.province,
            country: String(location.country ?? "Indonesia"),
            latitude: Number(values.latitude) || 0,
            longitude: Number(values.longitude) || 0,
          },
          contact: {
            address: values.address,
            whatsapp: values.whatsapp,
            email: values.email,
            googleMapsUrl: values.googleMapsUrl,
          },
          socials: {
            instagram: values.instagram,
            facebook: values.facebook,
            youtube: values.youtube,
            tiktok: values.tiktok,
          },
        },
      });
      onSaved();
    } catch (failure) {
      onError(readError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8">
      <section className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Identitas situs</h2>
        <Field label="Nama situs" htmlFor="site-name" required>
          <Input id="site-name" value={values.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </Field>
        <Field label="Tagline" htmlFor="site-tagline" required>
          <Input id="site-tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Deskripsi singkat" htmlFor="site-description" required help="Dipakai pada metadata dan kutipan situs.">
          <Textarea id="site-description" rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Lokasi</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Desa" htmlFor="loc-village">
            <Input id="loc-village" value={values.village} onChange={(e) => set("village", e.target.value)} />
          </Field>
          <Field label="Kecamatan" htmlFor="loc-district">
            <Input id="loc-district" value={values.district} onChange={(e) => set("district", e.target.value)} />
          </Field>
          <Field label="Kabupaten" htmlFor="loc-regency">
            <Input id="loc-regency" value={values.regency} onChange={(e) => set("regency", e.target.value)} />
          </Field>
          <Field label="Provinsi" htmlFor="loc-province">
            <Input id="loc-province" value={values.province} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field label="Lintang" htmlFor="loc-lat" help="Contoh: -6.841111">
            <Input id="loc-lat" type="number" step="any" value={values.latitude} onChange={(e) => set("latitude", e.target.value)} />
          </Field>
          <Field label="Bujur" htmlFor="loc-lng" help="Contoh: 108.392778">
            <Input id="loc-lng" type="number" step="any" value={values.longitude} onChange={(e) => set("longitude", e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Kontak</h2>
        <Field label="Alamat" htmlFor="contact-address">
          <Input id="contact-address" value={values.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Nomor WhatsApp kantor" htmlFor="contact-wa" help="Format 62 diikuti nomor, mis. 6281234567890.">
          <Input id="contact-wa" value={values.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="contact-email">
          <Input id="contact-email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Tautan Google Maps" htmlFor="contact-maps">
          <Input id="contact-maps" type="url" value={values.googleMapsUrl} onChange={(e) => set("googleMapsUrl", e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Media sosial</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram" htmlFor="soc-ig">
            <Input id="soc-ig" value={values.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="Facebook" htmlFor="soc-fb">
            <Input id="soc-fb" value={values.facebook} onChange={(e) => set("facebook", e.target.value)} />
          </Field>
          <Field label="YouTube" htmlFor="soc-yt">
            <Input id="soc-yt" value={values.youtube} onChange={(e) => set("youtube", e.target.value)} />
          </Field>
          <Field label="TikTok" htmlFor="soc-tt">
            <Input id="soc-tt" value={values.tiktok} onChange={(e) => set("tiktok", e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-3 flex items-center justify-between gap-4 rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-surface/95 px-4 py-2.5 shadow-adm-sm backdrop-blur-sm">
        <p className="text-xs text-adm-subtle">Perubahan tayang di situs dalam 1 sampai 2 menit.</p>
        <Button type="submit" variant="primary" loading={saving}>
          {saving ? "Menyimpan..." : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}

function SeoForm({
  seo,
  onSaved,
  onError,
}: {
  seo: Record<string, unknown>;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [values, setValues] = useState({
    defaultTitle: String(seo.defaultTitle ?? ""),
    titleTemplate: String(seo.titleTemplate ?? ""),
    defaultDescription: String(seo.defaultDescription ?? ""),
    ogImage: String(seo.ogImage ?? ""),
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiSend("/api/admin/settings", "POST", { key: "seo", values });
      onSaved();
    } catch (failure) {
      onError(readError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-[12px] border border-adm-border bg-adm-surface p-5">
      <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Metadata mesin pencari</h2>
      <Field label="Judul default" htmlFor="seo-title" required help="Judul halaman utama di hasil pencarian.">
        <Input id="seo-title" value={values.defaultTitle} onChange={(e) => setValues((v) => ({ ...v, defaultTitle: e.target.value }))} />
      </Field>
      <Field
        label="Pola judul halaman"
        htmlFor="seo-template"
        required
        help='Penanda "%s" diganti judul halaman. Contoh: %s | Desa Wisata Bantaragung.'
      >
        <Input id="seo-template" value={values.titleTemplate} onChange={(e) => setValues((v) => ({ ...v, titleTemplate: e.target.value }))} />
      </Field>
      <Field label="Deskripsi default" htmlFor="seo-desc" required help="Idealnya 120 sampai 160 karakter.">
        <Textarea id="seo-desc" rows={4} value={values.defaultDescription} onChange={(e) => setValues((v) => ({ ...v, defaultDescription: e.target.value }))} />
        <p className="text-right text-xs text-adm-subtle">{values.defaultDescription.length}/160</p>
      </Field>
      <Field label="Gambar pratinjau (OG)" htmlFor="seo-og" help="Path relatif di repositori aset, mis. _brand/covers/og-default.png.">
        <Input id="seo-og" value={values.ogImage} onChange={(e) => setValues((v) => ({ ...v, ogImage: e.target.value }))} />
      </Field>

      <div className="flex items-center justify-between gap-4 border-t border-adm-divider pt-4">
        <p className="text-xs text-adm-subtle">Perubahan tayang di situs dalam 1 sampai 2 menit.</p>
        <Button type="submit" variant="primary" loading={saving}>
          {saving ? "Menyimpan..." : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}

function SystemInfo({
  info,
  config,
}: {
  info: SettingsClientProps["info"];
  config: SettingsClientProps["config"];
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Status dasbor</h2>
        <dl className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[13px] text-adm-subtle">Token GitHub</dt>
            <dd>
              {config.token ? <Badge variant="success">Terpasang</Badge> : <Badge variant="danger">Belum diatur</Badge>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[13px] text-adm-subtle">Akun admin</dt>
            <dd>
              {config.auth ? <Badge variant="success">Aktif</Badge> : <Badge variant="danger">Belum diatur</Badge>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[13px] text-adm-subtle">Kata sandi</dt>
            <dd>
              {config.hashedPassword ? (
                <Badge variant="success">Terenkripsi (scrypt)</Badge>
              ) : config.plainPassword ? (
                <Badge variant="warning">Teks biasa, sebaiknya dienkripsi</Badge>
              ) : (
                <Badge variant="danger">Belum diatur</Badge>
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-adm-subtle">
          Semua nilai sensitif diatur lewat environment variabel di Vercel, bukan lewat
          halaman ini.
        </p>
      </section>

      <section className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-adm-ink">Repositori</h2>
        <dl className="mt-4 space-y-3">
          <SystemRow label="Konten" value={info.contentRepo} />
          <SystemRow label="Aset gambar" value={info.assetsRepo} />
          <SystemRow label="Branch" value={info.branch} />
          <SystemRow label="Basis CDN" value={info.cdnBase} />
          <SystemRow label="Alamat situs" value={info.siteUrl} />
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-adm-subtle">
          Konten disimpan sebagai berkas JSON di repositori. Setiap penyimpanan membuat satu
          commit, dan commit itu memicu pembangunan ulang situs.
        </p>
      </section>
    </div>
  );
}

function SystemRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-adm-divider pb-3 last:border-0 last:pb-0">
      <dt className="shrink-0 text-[13px] text-adm-subtle">{label}</dt>
      <dd className="break-all text-right font-mono text-xs text-adm-text">{value}</dd>
    </div>
  );
}

function readError(failure: unknown): string {
  if (typeof failure === "object" && failure !== null && "error" in failure) {
    return String((failure as { error: unknown }).error);
  }
  return "Terjadi kesalahan. Coba lagi.";
}
