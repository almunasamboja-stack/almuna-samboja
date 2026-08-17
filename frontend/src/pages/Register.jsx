import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    courseIds: [],
    address: '',
    parentPhone: '',
  });
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);

  useEffect(() => {
    api
      .get('/courses')
      .then(({ data }) => setCourses(data.courses))
      .catch(() => setCourses([]));
  }, []);

  // Kelompokkan kursus berdasarkan kategori agar mudah dipilih (dropdown per tab kategori)
  const grouped = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCourse(courseId) {
    setForm((f) => {
      const already = f.courseIds.includes(courseId);
      return {
        ...f,
        courseIds: already ? f.courseIds.filter((id) => id !== courseId) : [...f.courseIds, courseId],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      if (user.role === 'STUDENT') {
        setPendingNotice(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mendaftar, coba lagi');
    } finally {
      setLoading(false);
    }
  }

  if (pendingNotice) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="card w-full max-w-md text-center">
            <div className="w-14 h-14 rounded-full bg-gold/20 text-gold flex items-center justify-center text-2xl mx-auto mb-4">
              ⏳
            </div>
            <h1 className="text-xl font-bold text-navy mb-2">Pendaftaran Berhasil Dikirim</h1>
            <p className="text-sm text-slate-500 mb-6">
              Akun Anda sedang menunggu persetujuan admin. Anda akan bisa mengakses dashboard
              penuh setelah pendaftaran disetujui.
            </p>
            <Link to="/login" className="btn-primary w-full inline-block">
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="card w-full max-w-md">
          <h1 className="text-2xl font-bold text-navy mb-1">Daftar Kursus</h1>
          <p className="text-sm text-slate-500 mb-6">Buat akun baru untuk bergabung di Almuna Samboja.</p>

          {error && (
            <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Daftar sebagai</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
              >
                <option value="STUDENT">Siswa / Orang Tua</option>
                <option value="TEACHER">Guru / Instruktur</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nama Lengkap</label>
              <input
                required
                className="input-field"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="input-field"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>

            {form.role === 'STUDENT' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Pilih Kelas Kursus <span className="text-slate-400 font-normal">(boleh lebih dari satu)</span>
                  </label>
                  <div className="border border-slate-300 rounded-lg max-h-56 overflow-y-auto p-3 space-y-3">
                    {Object.entries(grouped).map(([category, list]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{category}</p>
                        <div className="space-y-1.5">
                          {list.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.courseIds.includes(c.id)}
                                onChange={() => toggleCourse(c.id)}
                                className="rounded border-slate-300 text-gold focus:ring-gold"
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {courses.length === 0 && <p className="text-xs text-slate-400">Memuat daftar kelas...</p>}
                  </div>
                  {form.courseIds.length === 0 && (
                    <p className="text-xs text-maroon mt-1">Pilih minimal 1 kelas.</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Alamat</label>
                  <input
                    className="input-field"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Alamat lengkap"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">No. HP Orang Tua (untuk notifikasi WA)</label>
                  <input
                    className="input-field"
                    value={form.parentPhone}
                    onChange={(e) => update('parentPhone', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Akun Anda akan aktif setelah disetujui oleh admin.
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (form.role === 'STUDENT' && form.courseIds.length === 0)}
              className="btn-primary w-full"
            >
              {loading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-gold font-semibold hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
