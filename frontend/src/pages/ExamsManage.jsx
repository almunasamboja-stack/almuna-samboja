// Halaman admin/guru: kelola ujian online (pilih soal dari Google Drive, atur kunci jawaban, publish)
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const EMPTY_FORM = {
  title: '',
  description: '',
  driveFileId: '',
  driveFileName: '',
  courseId: '',
  totalQuestions: 10,
  durationMinutes: '',
};

const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'];

export default function ExamsManage() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveError, setDriveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [answerKeys, setAnswerKeys] = useState([]); // [{questionNumber, correctAnswer}]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadExams();
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
    loadDriveFiles();
  }, []);

  async function loadExams() {
    setLoading(true);
    try {
      const { data } = await api.get('/exams');
      setExams(data.exams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDriveFiles() {
    setDriveError('');
    try {
      const { data } = await api.get('/exams/drive-files');
      setDriveFiles(data.files);
    } catch (err) {
      setDriveError(err.response?.data?.message || 'Gagal memuat daftar file dari Google Drive');
    }
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function buildEmptyAnswerKeys(count) {
    return Array.from({ length: count }, (_, i) => ({ questionNumber: i + 1, correctAnswer: 'A' }));
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAnswerKeys(buildEmptyAnswerKeys(10));
    setError('');
    setModalOpen(true);
  }

  function openEditModal(exam) {
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      description: exam.description || '',
      driveFileId: exam.driveFileId,
      driveFileName: exam.driveFileName || '',
      courseId: exam.course?.id || '',
      totalQuestions: exam.totalQuestions,
      durationMinutes: exam.durationMinutes || '',
    });
    setAnswerKeys(
      exam.answerKeys.length > 0
        ? exam.answerKeys.map((k) => ({ questionNumber: k.questionNumber, correctAnswer: k.correctAnswer }))
        : buildEmptyAnswerKeys(exam.totalQuestions)
    );
    setError('');
    setModalOpen(true);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleTotalQuestionsChange(value) {
    const count = Math.max(1, Math.min(200, Number(value) || 1));
    update('totalQuestions', count);
    setAnswerKeys((prev) => {
      const next = buildEmptyAnswerKeys(count);
      return next.map((n, i) => (prev[i] ? { ...n, correctAnswer: prev[i].correctAnswer } : n));
    });
  }

  function handleDriveFileSelect(fileId) {
    const file = driveFiles.find((f) => f.id === fileId);
    update('driveFileId', fileId);
    update('driveFileName', file ? file.name : '');
  }

  function setAnswerFor(questionNumber, letter) {
    setAnswerKeys((prev) =>
      prev.map((a) => (a.questionNumber === questionNumber ? { ...a, correctAnswer: letter } : a))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { ...form, answerKeys };
      if (editingId) {
        await api.put(`/exams/${editingId}`, payload);
        showToast('Ujian berhasil diperbarui.');
      } else {
        await api.post('/exams', payload);
        showToast('Ujian berhasil dibuat.');
      }
      setModalOpen(false);
      await loadExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan ujian');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/exams/${id}`);
      setExams((prev) => prev.filter((e) => e.id !== id));
      showToast('Ujian berhasil dihapus.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus ujian');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleTogglePublish(exam) {
    try {
      const { data } = await api.patch(`/exams/${exam.id}/publish`, { isPublished: !exam.isPublished });
      setExams((prev) => prev.map((e) => (e.id === exam.id ? data.exam : e)));
      showToast(data.exam.isPublished ? 'Ujian sekarang tampil untuk siswa.' : 'Ujian disembunyikan dari siswa.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengubah status ujian');
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Kelola Ujian Online</h1>
            <p className="text-slate-500 text-sm mt-1">Ambil soal dari Google Drive, atur kunci jawaban, dan publikasikan ke siswa.</p>
          </div>
          <button onClick={openAddModal} className="btn-primary">
            + Buat Ujian
          </button>
        </div>

        {driveError && (
          <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-6">
            ⚠ {driveError} — pastikan folder Google Drive sudah dibagikan ke akun Service Account.
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Memuat data ujian...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div key={exam.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${exam.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {exam.isPublished ? 'Dipublikasikan' : 'Draft'}
                  </span>
                  <span className="text-xs text-slate-400">{exam._count.attempts} kali dikerjakan</span>
                </div>
                <h3 className="font-bold text-navy mb-1">{exam.title}</h3>
                <p className="text-sm text-slate-500 mb-1">{exam.course?.name || 'Semua kelas'}</p>
                <p className="text-xs text-slate-400 mb-3">
                  {exam.totalQuestions} soal{exam.durationMinutes ? ` · ${exam.durationMinutes} menit` : ''} · File: {exam.driveFileName || exam.driveFileId}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <button onClick={() => handleTogglePublish(exam)} className="text-navy font-medium hover:text-gold transition">
                    {exam.isPublished ? 'Sembunyikan' : 'Publikasikan'}
                  </button>
                  <button onClick={() => openEditModal(exam)} className="text-navy font-medium hover:text-gold transition">
                    Edit
                  </button>
                  {confirmDeleteId === exam.id ? (
                    <>
                      <button onClick={() => handleDelete(exam.id)} className="text-maroon font-semibold">Yakin?</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Batal</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(exam.id)} className="text-maroon font-medium hover:underline">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <p className="text-slate-400 col-span-full text-center py-10">Belum ada ujian dibuat.</p>
            )}
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
            <h3 className="text-lg font-bold text-navy mb-4">{editingId ? 'Edit Ujian' : 'Buat Ujian Baru'}</h3>

            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Judul Ujian</label>
                <input required className="input-field" value={form.title} onChange={(e) => update('title', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Deskripsi (opsional)</label>
                <textarea rows={2} className="input-field" value={form.description} onChange={(e) => update('description', e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">File Soal (dari Google Drive)</label>
                <select required className="input-field" value={form.driveFileId} onChange={(e) => handleDriveFileSelect(e.target.value)}>
                  <option value="">-- Pilih file soal --</option>
                  {driveFiles.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {driveFiles.length === 0 && !driveError && (
                  <p className="text-xs text-slate-400 mt-1">Memuat daftar file dari Google Drive...</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Kelas (opsional)</label>
                  <select className="input-field" value={form.courseId} onChange={(e) => update('courseId', e.target.value)}>
                    <option value="">Semua kelas</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Jumlah Soal</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    className="input-field"
                    value={form.totalQuestions}
                    onChange={(e) => handleTotalQuestionsChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Durasi (menit)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.durationMinutes}
                    onChange={(e) => update('durationMinutes', e.target.value)}
                    placeholder="Tanpa batas"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Kunci Jawaban</label>
                <div className="border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {answerKeys.map((a) => (
                    <div key={a.questionNumber} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 w-14 shrink-0">No. {a.questionNumber}</span>
                      <div className="flex gap-1">
                        {ANSWER_OPTIONS.map((letter) => (
                          <button
                            type="button"
                            key={letter}
                            onClick={() => setAnswerFor(a.questionNumber, letter)}
                            className={`w-7 h-7 rounded-md text-xs font-bold transition ${
                              a.correctAnswer === letter ? 'bg-gold text-navy' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
