import { Platform } from "react-native";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

let _token: string | null = null;
export function setApiToken(t: string | null) {
  _token = t;
}
export function getApiToken() {
  return _token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_token) headers.Authorization = `Bearer ${_token}`;
  let body: any;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}/api${path}`, { method: opts.method || "GET", headers, body });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.detail
      ? typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail)
      : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  return `${BASE}/api/files/${path}?token=${_token || ""}`;
}

export async function uploadImage(uri: string, name = "photo.jpg", type = "image/jpeg"): Promise<string> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await api<{ path: string }>("/upload", { method: "POST", form });
  return res.path;
}
