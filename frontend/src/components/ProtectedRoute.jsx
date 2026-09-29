// Melindungi route privat: redirect ke /login jika belum auth, cek role jika perlu
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-slate-400">Memuat...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Siswa yang belum disetujui (PENDING) atau ditolak (REJECTED) admin
  // tidak boleh mengakses fitur apa pun di aplikasi, kecuali halaman ini sendiri.
  if (user.role === 'STUDENT' && user.studentStatus && user.studentStatus !== 'APPROVED') {
    const rejected = user.studentStatus === 'REJECTED';
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center">
          <div className={`text-4xl mb-3 ${rejected ? '' : 'animate-pulse'}`}>{rejected ? '🚫' : '⏳'}</div>
          <h2 className="text-lg font-bold text-navy mb-2">
            {rejected ? 'Pendaftaran Ditolak' : 'Menunggu Persetujuan Admin'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {rejected
              ? 'Mohon maaf, pendaftaran Anda belum bisa disetujui. Silakan hubungi admin Almuna Samboja untuk informasi lebih lanjut.'
              : 'Akun Anda sudah terdaftar dan sedang menunggu konfirmasi dari admin. Anda belum bisa mengakses fitur apa pun sampai akun disetujui.'}
          </p>
          <button onClick={logout} className="btn-outline text-sm px-5 py-2">
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return children;
}
