import type { Mapping, PreviewResponse } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export async function previewCsv(file: File): Promise<PreviewResponse> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_BASE}/api/preview`, { method: "POST", body });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<PreviewResponse>;
}

export async function transformCsv(file: File, mapping: Mapping): Promise<Blob> {
  const body = new FormData();
  body.append("file", file);
  body.append("mapping", JSON.stringify(mapping));
  const res = await fetch(`${API_BASE}/api/transform`, { method: "POST", body });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
