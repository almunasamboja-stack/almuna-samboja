// Halaman Absensi Hari Ini - dipakai oleh Guru & Admin, dengan pengelompokan tab per kelas
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceCard from '../components/AttendanceCard';
import AttendanceModal from '../components/AttendanceModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL'); // 'ALL' atau id kursus (string)
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadStudents(activeCourseId);
  }, [activeCourseId]);

  async function loadStudents(courseId) {
    setLoading(true);
    try {
      const params = courseId && courseId !== 'ALL' ? { courseId } : {};
      const { data } = await api.get('/attendance/today', { params });
      setStudents(data.students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(studentId, status, notify) {
    setSubmitting(true);
    try {
      const { data } = await api.post('/attendance', { studentId, status, notify });
      setStudents((prev) =>
        prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
      );
      setToast(
        data.notified
          ? 'Absensi tersimpan & notifikasi WhatsApp terkirim ke wali murid.'
          : 'Absensi tersimpan.'
      );
      setSelected(null);
    } catch (err) {
      setToast(err.response?.data?.message || 'Gagal menyimpan absensi');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3500);
    }
  }

  const total = students.length;
  const done = students.filter((s) => s.status).length;
  const hadir = students.filter((s) => s.status === 'PRESENT').length;

  // Hanya tampilkan tab kelas yang benar-benar punya siswa terdaftar, dikelompokkan per kategori
  const courseTabsByCategory = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Absensi Hari Ini</h1>
            <p className="text-slate-500 text-sm mt-1">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {user?.role === 'ADMIN' && ' · Tampilan admin: bisa pilih kelas mana pun untuk diabsen/dipantau.'}
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="card !p-3 text-center min-w-[90px]">
              <p className="text-xl font-bold text-navy">{total}</p>
              <p className="text-slate-500">Total</p>
            </div>
            <div className="card !p-3 text-center min-w-[90px]">
              <p className="text-xl font-bold text-green-600">{hadir}</p>
              <p className="text-slate-500">Hadir</p>
            </div>
            <div className="card !p-3 text-center min-w-[90px]">
              <p className="text-xl font-bold text-slate-600">{done}/{total}</p>
              <p className="text-slate-500">Sudah Diabsen</p>
            </div>
          </div>
        </div>

        {/* PILIHAN / TAB KELAS */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pilih Kelas</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCourseId('ALL')}
              className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
                activeCourseId === 'ALL'
                  ? 'bg-navy border-navy text-white'
                  : 'border-slate-200 text-slate-500 hover:border-navy hover:text-navy'
              }`}
            >
              Semua Kelas
            </button>
            {Object.entries(courseTabsByCategory).map(([category, list]) => (
              <div key={category} className="contents">
                {list.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCourseId(String(c.id))}
                    title={category}
                    className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
                      activeCourseId === String(c.id)
                        ? 'bg-gold border-gold text-navy'
                        : 'border-slate-200 text-slate-500 hover:border-gold hover:text-navy'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat data siswa...</p>
        ) : students.length === 0 ? (
          <p className="text-slate-400">
            {activeCourseId === 'ALL'
              ? 'Belum ada siswa yang disetujui. Jalankan seeder atau setujui pendaftar di Kelola Siswa.'
              : 'Belum ada siswa disetujui di kelas ini.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {students.map((s) => (
              <AttendanceCard key={s.studentId} student={s} onClick={setSelected} />
            ))}
          </div>
        )}
      </main>

      <AttendanceModal
        student={selected}
        onClose={() => setSelected(null)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-5 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
