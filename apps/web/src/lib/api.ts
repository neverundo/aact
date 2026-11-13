import { getAppLocale } from "./locale";

export type ApiError = {
  message?: string;
  code?: string;
  params?: Record<string, string | number>;
  errors?: Record<string, string[]>;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export async function ensureCsrfCookie(): Promise<void> {
  await fetch("/sanctum/csrf-cookie", {
    method: "GET",
    credentials: "include",
  });
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", getAppLocale());
  }

  if (method !== "GET" && method !== "HEAD") {
    await ensureCsrfCookie();
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) {
      headers.set("X-XSRF-TOKEN", xsrf);
    }
    if (
      !headers.has("Content-Type") &&
      init.body &&
      !(init.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    const fallback =
      getAppLocale() === "en" ? "Request failed" : "Pedido falhou";
    const error = new Error(payload.message ?? fallback) as Error & {
      status: number;
      payload: ApiError;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

/** Fetch a binary response (document downloads). Never parses JSON on success. */
export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/octet-stream");
  }

  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", getAppLocale());
  }

  if (method !== "GET" && method !== "HEAD") {
    await ensureCsrfCookie();
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) {
      headers.set("X-XSRF-TOKEN", xsrf);
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiError;
    const fallback =
      getAppLocale() === "en" ? "Request failed" : "Pedido falhou";
    const error = new Error(payload.message ?? fallback) as Error & {
      status: number;
      payload: ApiError;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return response.blob();
}
