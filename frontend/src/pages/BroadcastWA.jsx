// Halaman admin: kirim pesan WhatsApp massal ke wali murid, pilih nomor via checkbox
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

export default function BroadcastWA() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [activeCourseId]);

  async function loadRecipients() {
    setLoading(true);
    try {
      const params = activeCourseId !== 'ALL' ? { courseId: activeCourseId } : {};
      const { data } = await api.get('/broadcast/recipients', { params });
      setStudents(data.students);
      // Buang seleksi siswa yang sudah tidak tampil di daftar ini (misal ganti tab kelas)
      setSelectedIds((prev) => {
        const visibleIds = new Set(data.students.map((s) => s.studentId));
        return new Set([...prev].filter((id) => visibleIds.has(id)));
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const courseTabsByCategory = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  function toggleOne(studentId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      if (prev.size === students.length) return new Set();
      return new Set(students.map((s) => s.studentId));
    });
  }

  async function handleSend() {
    setError('');
    setResult(null);
    if (selectedIds.size === 0) {
      setError('Pilih minimal 1 penerima');
      return;
    }
    if (!message.trim()) {
      setError('Isi pesan wajib diisi');
      return;
    }

    setSending(true);
    try {
      const { data } = await api.post('/broadcast/send', {
        studentIds: [...selectedIds],
        message,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  }

  const allSelected = students.length > 0 && selectedIds.size === students.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Kirim Pesan WhatsApp</h1>
          <p className="text-slate-500 text-sm mt-1">Pilih penerima, tulis pesan, kirim ke banyak wali murid sekaligus.</p>
        </div>

        {/* TAB PILIH KELAS */}
        <div className="flex gap-2 mb-6 flex-wrap">
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* DAFTAR PENERIMA */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-navy">Pilih Penerima ({selectedIds.size} terpilih)</p>
              <button onClick={toggleAll} className="text-sm text-navy hover:text-gold transition font-medium">
                {allSelected ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
            </div>

            {loading ? (
              <p className="text-slate-400 text-sm">Memuat daftar siswa...</p>
            ) : students.length === 0 ? (
              <p className="text-slate-400 text-sm">Tidak ada siswa disetujui di kelas ini.</p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
                {students.map((s) => (
                  <label
                    key={s.studentId}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.studentId)}
                      onChange={() => toggleOne(s.studentId)}
                      className="rounded border-slate-300 text-gold focus:ring-gold"
                    />
                    <img src={resolveImageUrl(s.avatarUrl)} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.class}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{s.parentPhone}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* FORM PESAN */}
          <div className="card flex flex-col">
            <p className="font-semibold text-navy mb-3">Tulis Pesan</p>

            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-3">{error}</div>}

            <textarea
              rows={8}
              className="input-field flex-1 mb-4"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Assalamualaikum, kami informasikan bahwa kegiatan belajar besok diliburkan..."
            />

            <button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0}
              className="btn-primary disabled:opacity-50"
            >
              {sending ? 'Mengirim...' : `Kirim ke ${selectedIds.size} Nomor`}
            </button>

            {result && (
              <div className="mt-4 bg-surface rounded-lg p-4 text-sm">
                <p className="font-semibold text-navy mb-2">{result.message}</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.results.map((r) => (
                    <div key={r.studentId} className="flex justify-between text-xs">
                      <span>{r.name} ({r.parentPhone})</span>
                      <span className={r.success ? 'text-green-600 font-medium' : 'text-maroon font-medium'}>
                        {r.success ? 'Terkirim' : 'Gagal'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
