// Halaman admin: kelola foto galeri kegiatan yang tampil di landing page
import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

export default function AdminGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    setLoading(true);
    try {
      const { data } = await api.get('/gallery');
      setPhotos(data.photos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      if (caption) fd.append('caption', caption);
      await api.post('/gallery', fd);
      setCaption('');
      showToast('Foto berhasil ditambahkan ke galeri.');
      await loadPhotos();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengunggah foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/gallery/${id}`);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      showToast('Foto berhasil dihapus.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus foto');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Kelola Galeri Kegiatan</h1>
          <p className="text-slate-500 text-sm mt-1">Foto di sini tampil otomatis di halaman utama (landing page).</p>
        </div>

        <div className="card mb-8 flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-slate-700 block mb-1">Keterangan foto (opsional)</label>
            <input
              className="input-field"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Contoh: Kegiatan belajar kelompok"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary whitespace-nowrap"
          >
            {uploading ? 'Mengunggah...' : '+ Unggah Foto'}
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat galeri...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square">
                <img src={resolveImageUrl(p.imageUrl)} alt={p.caption || 'Foto kegiatan'} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2 text-center">
                  {p.caption && <p className="text-white text-xs">{p.caption}</p>}
                  {confirmDeleteId === p.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(p.id)} className="bg-maroon text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                        Yakin Hapus?
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="bg-white text-navy text-xs font-semibold px-3 py-1.5 rounded-lg">
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="bg-maroon text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <p className="text-slate-400 col-span-full text-center py-10">
                Belum ada foto galeri. Unggah foto pertama Anda di atas.
              </p>
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-5 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
