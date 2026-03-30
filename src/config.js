/** Central API config — driven by Vite env vars in production */
export const API_ORIGIN =
  import.meta.env?.VITE_API_ORIGIN || "http://localhost:5000";

export const API_BASE = `${API_ORIGIN}/api`;
export const IMG_BASE = API_ORIGIN;
