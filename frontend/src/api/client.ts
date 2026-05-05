import type { DiagnosticReport, Mapping, PreviewResponse, RepairOptions } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export async function previewCsv(file: File): Promise<PreviewResponse> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_BASE}/api/preview`, { method: "POST", body });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<PreviewResponse>;
}

export async function validateCsv(file: File): Promise<DiagnosticReport> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_BASE}/api/validate`, { method: "POST", body });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<DiagnosticReport>;
}

export async function transformCsv(
  file: File,
  mapping: Mapping,
  repairs: RepairOptions
): Promise<{ blob: Blob; filename: string }> {
  const body = new FormData();
  body.append("file", file);
  body.append("mapping", JSON.stringify(mapping));
  body.append("repairs", JSON.stringify(repairs));
  const res = await fetch(`${API_BASE}/api/transform`, { method: "POST", body });
  if (!res.ok) throw new Error(await res.text());

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename=([^\s;]+)/);
  const filename = match ? match[1] : "shopify_ready.csv";

  return { blob: await res.blob(), filename };
}
