// Halaman profil sederhana untuk admin & guru: kelola foto profil & ganti password sendiri
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AvatarManager from '../components/AvatarManager';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ROLE_LABEL = { ADMIN: 'Admin', TEACHER: 'Guru / Instruktur', STUDENT: 'Siswa' };

export default function MyProfile() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => setAvatarUrl(data.user.avatarUrl)).catch(() => {});
  }, []);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUpload(file) {
    const fd = new FormData();
    fd.append('avatar', file);
    const { data } = await api.post('/users/me/avatar', fd);
    setAvatarUrl(data.user.avatarUrl);
    showToast('Foto profil berhasil diperbarui.');
  }

  async function handleDelete() {
    const { data } = await api.delete('/users/me/avatar');
    setAvatarUrl(data.user.avatarUrl);
    showToast('Foto profil berhasil dihapus.');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <div className="card w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-navy mb-6">Profil Saya</h1>
          <div className="flex justify-center mb-5">
            <AvatarManager avatarUrl={avatarUrl} onUpload={handleUpload} onDelete={handleDelete} />
          </div>
          <h2 className="text-lg font-bold text-navy">{user?.name}</h2>
          <p className="text-slate-500 text-sm mb-1">{user?.email}</p>
          <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-gold/20 text-navy">
            {ROLE_LABEL[user?.role] || user?.role}
          </span>
        </div>

        <div className="card w-full max-w-md">
          <h2 className="text-lg font-bold text-navy mb-4">Ganti Password</h2>
          <ChangePasswordForm />
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-5 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
