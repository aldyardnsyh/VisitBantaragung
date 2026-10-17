"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <form onSubmit={submit} noValidate className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[#fecaca] bg-adm-danger-soft px-3 py-2.5 text-sm text-adm-danger"
        >
          {error}
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
            className="pr-16"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="adm-ring adm-transition absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-adm-subtle hover:text-adm-ink"
          >
            {showPassword ? "Sembunyi" : "Lihat"}
          </button>
        </div>
      </Field>

      <Button type="submit" variant="primary" loading={loading} className="h-11 w-full">
        {loading ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}
