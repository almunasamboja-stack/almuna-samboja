import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Logo Almuna Samboja" className="w-9 h-9 object-contain" />
          <span className="font-bold text-navy text-lg tracking-tight">Almuna Samboja</span>
        </Link>

        <nav className="flex items-center gap-3">
          {!user && (
            <>
              <Link to="/login" className="btn-outline text-sm px-4 py-2">
                Masuk
              </Link>
              <Link to="/register" className="btn-primary text-sm px-4 py-2">
                Daftar Kursus
              </Link>
            </>
          )}

          {user && user.role === 'STUDENT' && (
            <>
              <Link to="/user" className="text-sm font-medium text-navy hover:text-gold transition">
                Dashboard Saya
              </Link>
              <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">
                Keluar
              </button>
            </>
          )}

          {user && user.role === 'TEACHER' && (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-navy hover:text-gold transition">
                Absensi
              </Link>
              <Link to="/grades" className="text-sm font-medium text-navy hover:text-gold transition">
                Nilai Harian
              </Link>
              <Link to="/profile" className="text-sm font-medium text-navy hover:text-gold transition">
                Profil Saya
              </Link>
              <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">
                Keluar
              </button>
            </>
          )}

          {user && user.role === 'ADMIN' && (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-navy hover:text-gold transition">
                Absensi
              </Link>
              <Link to="/grades" className="text-sm font-medium text-navy hover:text-gold transition">
                Nilai Harian
              </Link>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  className="text-sm font-medium text-navy hover:text-gold transition flex items-center gap-1"
                >
                  Kelola
                  <span className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                    <Link to="/admin/students" className="block px-4 py-2 text-sm text-navy hover:bg-surface">
                      Kelola Siswa
                    </Link>
                    <Link to="/admin/courses" className="block px-4 py-2 text-sm text-navy hover:bg-surface">
                      Kelola Kursus
                    </Link>
                    <Link to="/admin/gallery" className="block px-4 py-2 text-sm text-navy hover:bg-surface">
                      Kelola Galeri
                    </Link>
                    <Link to="/admin/reports" className="block px-4 py-2 text-sm text-navy hover:bg-surface">
                      Rekap Kelas
                    </Link>
                    <Link to="/admin/payments" className="block px-4 py-2 text-sm text-navy hover:bg-surface">
                      Pembayaran SPP
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-navy hover:bg-surface">
                      Profil Saya
                    </Link>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">
                Keluar
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
