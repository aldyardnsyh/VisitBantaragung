"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiSend } from "../_lib/api";
import Button from "../_components/Button";
import { Field, Input } from "../_components/Form";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Nama pengguna dan kata sandi wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await apiSend("/api/admin/auth", "POST", { username, password });
      router.replace(nextPath || "/admin");
      router.refresh();
    } catch (failure) {
      const message =
        typeof failure === "object" && failure !== null && "error" in failure
          ? String((failure as { error: unknown }).error)
          : "Gagal masuk. Coba lagi.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-adm-md)] border border-[#f3d3d3] bg-adm-danger-soft px-3 py-2.5"
        >
          <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-adm-danger" />
          <p className="text-[12.5px] leading-relaxed text-adm-danger">{error}</p>
        </div>
      ) : null}

      <Field label="Nama pengguna" htmlFor="admin-username" required>
        <Input
          id="admin-username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          autoFocus
        />
      </Field>

      <Field label="Kata sandi" htmlFor="admin-password" required>
        <div className="relative">
          <Input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="adm-ring adm-transition absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
          >
            {showPassword ? (
              <EyeOff aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <Eye aria-hidden className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </Field>

      <Button type="submit" variant="primary" loading={loading} className="mt-1 h-10 w-full">
        {loading ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}
