// Helper untuk menampilkan foto yang datang dari backend.
// Foto yang diunggah disimpan sebagai path relatif ("/uploads/avatars/xxx.jpg"),
// sedangkan avatar default masih berupa URL penuh dari i.pravatar.cc.

// Ambil origin backend dari VITE_API_URL (buang akhiran /api)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_ORIGIN}${url}`;
}
