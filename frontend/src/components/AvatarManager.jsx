// Komponen reusable untuk kelola foto profil: tambah/ganti (upload) & hapus.
// Dipakai di halaman profil siswa, guru, admin, maupun oleh admin saat mengelola akun lain.
import { useRef, useState } from 'react';
import { resolveImageUrl } from '../utils/media';

export default function AvatarManager({ avatarUrl, onUpload, onDelete, size = 'w-28 h-28' }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={resolveImageUrl(avatarUrl)}
        alt="Foto profil"
        className={`${size} rounded-full object-cover border-4 border-slate-100 shadow`}
      />
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-navy text-navy hover:bg-navy hover:text-white transition disabled:opacity-50"
        >
          {busy ? 'Memproses...' : 'Ganti Foto'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleDelete}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-maroon text-maroon hover:bg-maroon hover:text-white transition disabled:opacity-50"
        >
          Hapus Foto
        </button>
      </div>
    </div>
  );
}
