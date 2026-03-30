export const API_ORIGIN =
  import.meta.env?.VITE_API_ORIGIN || "http://localhost:5000";

export function assetUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `${API_ORIGIN}${s.startsWith("/") ? "" : "/"}${s}`;
}
