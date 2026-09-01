// Halaman admin/guru: rekap nilai hasil ujian per anak (CRUD + sortir), plus ringkasan rata-rata per ujian
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const EMPTY_FORM = { studentId: '', examId: '', score: '', correctCount: '', totalQuestions: '', submittedAt: new Date().toISOString().slice(0, 10) };

function SortIcon({ active, direction }) {
  if (!active) return <span className="text-slate-300 ml-1">↕</span>;
  return <span className="text-navy ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export default function ExamResultsRecap() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [attempts, setAttempts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [searchName, setSearchName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
    api.get('/students').then(({ data }) => setStudents(data.students.filter((s) => s.status === 'APPROVED'))).catch(() => setStudents([]));
    api.get('/exams').then(({ data }) => setExams(data.exams)).catch(() => setExams([]));
  }, []);

  useEffect(() => {
    loadRecap();
  }, [activeCourseId]);

  async function loadRecap() {
    setLoading(true);
    try {
      const params = activeCourseId !== 'ALL' ? { courseId: activeCourseId } : {};
      const [{ data: recapData }, { data: summaryData }] = await Promise.all([
        api.get('/exams/results-recap', { params }),
        api.get('/exams/summary', { params }),
      ]);
      setAttempts(recapData.attempts);
      setSummary(summaryData.summary);
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

  const courseTabsByCategory = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  }

  const filteredAttempts = attempts.filter((a) =>
    a.studentName.toLowerCase().includes(searchName.trim().toLowerCase())
  );

  const sortedAttempts = [...filteredAttempts].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (sortBy === 'submittedAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    if (typeof valA === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(a) {
    setEditingId(a.attemptId);
    setForm({
      studentId: a.studentId,
      examId: '',
      score: a.score,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      submittedAt: a.submittedAt.slice(0, 10),
    });
    setError('');
    setModalOpen(true);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleExamChange(examId) {
    update('examId', examId);
    const exam = exams.find((e) => String(e.id) === String(examId));
    if (exam) update('totalQuestions', exam.totalQuestions);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/exams/attempts/${editingId}`, {
          score: Number(form.score),
          correctCount: Number(form.correctCount),
          totalQuestions: Number(form.totalQuestions),
          submittedAt: form.submittedAt,
        });
        showToast('Nilai ujian berhasil diperbarui.');
      } else {
        await api.post('/exams/attempts', {
          studentId: form.studentId,
          examId: form.examId,
          score: Number(form.score),
          correctCount: Number(form.correctCount),
          totalQuestions: Number(form.totalQuestions),
          submittedAt: form.submittedAt,
        });
        showToast('Nilai ujian berhasil dicatat.');
      }
      setModalOpen(false);
      await loadRecap();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan nilai ujian');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(attemptId) {
    try {
      await api.delete(`/exams/attempts/${attemptId}`);
      setAttempts((prev) => prev.filter((a) => a.attemptId !== attemptId));
      showToast('Nilai ujian berhasil dihapus.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus nilai ujian');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function handleDownloadExcel() {
    const rows = sortedAttempts.map((a) => ({
      'Nama Siswa': a.studentName,
      Pelajaran: a.courseName,
      'Judul Ujian': a.examTitle,
      Nilai: a.score,
      Benar: `${a.correctCount}/${a.totalQuestions}`,
      'Tanggal Dikerjakan': new Date(a.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai Ujian');

    const labelPelajaran = activeCourseId === 'ALL' ? 'Semua-Pelajaran' : (courses.find((c) => String(c.id) === activeCourseId)?.name || 'Pelajaran').replace(/\s+/g, '-');
    XLSX.writeFile(workbook, `Rekap-Nilai-Ujian-${labelPelajaran}.xlsx`);
  }

  const columns = [
    { key: 'studentName', label: 'Nama Siswa' },
    { key: 'courseName', label: 'Pelajaran' },
    { key: 'examTitle', label: 'Judul Ujian' },
    { key: 'score', label: 'Nilai' },
    { key: 'submittedAt', label: 'Tanggal' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Rekap Nilai Ujian</h1>
            <p className="text-slate-500 text-sm mt-1">Hasil ujian tiap siswa, difilter per pelajaran/kelas.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadExcel} disabled={attempts.length === 0} className="btn-outline disabled:opacity-50">
              ⬇ Download Excel
            </button>
            <button onClick={openAddModal} className="btn-primary">
              + Catat Nilai Manual
            </button>
          </div>
        </div>

        {/* TAB PILIH PELAJARAN/KELAS */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveCourseId('ALL')}
            className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
              activeCourseId === 'ALL'
                ? 'bg-navy border-navy text-white'
                : 'border-slate-200 text-slate-500 hover:border-navy hover:text-navy'
            }`}
          >
            Semua Pelajaran
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

        {/* FILTER NAMA SISWA */}
        <div className="mb-6">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="🔍 Cari nama siswa..."
            className="input-field max-w-xs"
          />
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat rekap...</p>
        ) : (
          <>
            {/* RINGKASAN RATA-RATA PER UJIAN */}
            {summary.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Ringkasan Per Ujian</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {summary.map((s) => (
                    <div key={s.examId} className="card !p-4">
                      <p className="font-semibold text-navy text-sm mb-1 truncate">{s.title}</p>
                      <p className="text-xs text-slate-400 mb-3">{s.courseName}</p>
                      {s.totalAttempts > 0 ? (
                        <>
                          <p className="text-2xl font-bold text-navy">{s.average}</p>
                          <p className="text-xs text-slate-500 mb-1">Rata-rata dari {s.totalAttempts} peserta</p>
                          <p className="text-xs text-slate-400">Tertinggi: {s.highest} · Terendah: {s.lowest}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">Belum ada yang mengerjakan</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABEL DETAIL PER PENGERJAAN - SORTABLE */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="pb-3 font-medium cursor-pointer select-none hover:text-navy transition"
                      >
                        {col.label}
                        <SortIcon active={sortBy === col.key} direction={sortDir} />
                      </th>
                    ))}
                    <th className="pb-3 font-medium text-center">Benar</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttempts.map((a) => (
                    <tr key={a.attemptId} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 font-medium text-navy">{a.studentName}</td>
                      <td className="py-3 text-slate-500">{a.courseName}</td>
                      <td className="py-3 text-slate-500">{a.examTitle}</td>
                      <td className="py-3 font-semibold text-navy">{a.score}</td>
                      <td className="py-3 text-slate-500">
                        {new Date(a.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 text-center text-slate-500">{a.correctCount}/{a.totalQuestions}</td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => openEditModal(a)} className="text-navy font-medium hover:text-gold transition">
                          Edit
                        </button>
                        {confirmDeleteId === a.attemptId ? (
                          <>
                            <button onClick={() => handleDelete(a.attemptId)} className="text-maroon font-semibold">Yakin?</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Batal</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(a.attemptId)} className="text-maroon font-medium hover:underline">
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sortedAttempts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        {searchName
                          ? `Tidak ada siswa bernama "${searchName}" pada pelajaran ini.`
                          : 'Belum ada hasil ujian untuk pelajaran ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <h3 className="text-lg font-bold text-navy mb-4">{editingId ? 'Edit Nilai Ujian' : 'Catat Nilai Ujian Manual'}</h3>

            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              {!editingId && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Siswa</label>
                    <select required className="input-field" value={form.studentId} onChange={(e) => update('studentId', e.target.value)}>
                      <option value="">-- Pilih siswa --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Ujian</label>
                    <select required className="input-field" value={form.examId} onChange={(e) => handleExamChange(e.target.value)}>
                      <option value="">-- Pilih ujian --</option>
                      {exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.title}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Nilai (0-100)</label>
                  <input type="number" min="0" max="100" required className="input-field" value={form.score} onChange={(e) => update('score', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Tanggal</label>
                  <input type="date" required className="input-field" value={form.submittedAt} onChange={(e) => update('submittedAt', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Jumlah Benar</label>
                  <input type="number" min="0" required className="input-field" value={form.correctCount} onChange={(e) => update('correctCount', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Total Soal</label>
                  <input type="number" min="1" required className="input-field" value={form.totalQuestions} onChange={(e) => update('totalQuestions', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn-outline" disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-5 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
