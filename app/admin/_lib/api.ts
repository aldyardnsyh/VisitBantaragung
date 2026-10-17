// Helper sisi klien untuk memanggil API dasbor.

export interface ApiFailure {
  error: string;
  status: number;
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Permintaan gagal (${response.status}).`;
    const failure: ApiFailure = { error: message, status: response.status };
    throw failure;
  }
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  return parse<T>(response);
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "DELETE" | "PUT",
  body?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return parse<T>(response);
}

export async function apiUpload<T>(url: string, form: FormData): Promise<T> {
  const response = await fetch(url, { method: "POST", body: form, cache: "no-store" });
  return parse<T>(response);
}

export function isApiFailure(value: unknown): value is ApiFailure {
  return typeof value === "object" && value !== null && "error" in value;
}
