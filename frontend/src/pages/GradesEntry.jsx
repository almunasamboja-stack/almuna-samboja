// Halaman "Nilai Harian" untuk guru & admin: input, edit, hapus nilai harian per kelas
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import GradeModal from '../components/GradeModal';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

export default function GradesEntry() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalStudent, setModalStudent] = useState(null);
  const [editingGrade, setEditingGrade] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
      const { data } = await api.get('/grades/class-today', { params });
      setStudents(data.students);
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

  function openAddModal(student) {
    setModalStudent(student);
    setEditingGrade(null);
  }

  function openEditModal(student, grade) {
    setModalStudent(student);
    setEditingGrade(grade);
  }

  async function handleSubmitGrade({ subject, score, date, notes, gradeId }) {
    setSubmitting(true);
    try {
      if (gradeId) {
        await api.put(`/grades/${gradeId}`, { subject, score, date, notes });
        showToast('Nilai berhasil diperbarui.');
      } else {
        await api.post('/grades', {
          studentId: modalStudent.studentId,
          subject,
          score,
          date,
          notes,
          type: 'DAILY',
        });
        showToast('Nilai berhasil ditambahkan.');
      }
      setModalStudent(null);
      setEditingGrade(null);
      await loadStudents(activeCourseId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan nilai');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGrade(gradeId) {
    try {
      await api.delete(`/grades/${gradeId}`);
      showToast('Nilai berhasil dihapus.');
      await loadStudents(activeCourseId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus nilai');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  const courseTabsByCategory = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Nilai Harian</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}Input nilai harian per siswa.
          </p>
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

        {loading ? (
          <p className="text-slate-400">Memuat data siswa...</p>
        ) : students.length === 0 ? (
          <p className="text-slate-400">Belum ada siswa disetujui di kelas ini.</p>
        ) : (
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.studentId} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 sm:w-56 shrink-0">
                  <img
                    src={resolveImageUrl(s.avatarUrl)}
                    alt={s.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-navy text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.class}</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-wrap gap-2 items-center">
                  {s.todayGrades.length === 0 && (
                    <span className="text-xs text-slate-400">Belum ada nilai hari ini</span>
                  )}
                  {s.todayGrades.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 bg-gold/10 text-navy text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full"
                    >
                      <button
                        onClick={() => openEditModal(s, g)}
                        className="hover:underline"
                        title={`${new Date(g.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}${g.notes ? ` · ${g.notes}` : ''}`}
                      >
                        {g.subject}: {g.score}
                      </button>
                      {confirmDeleteId === g.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteGrade(g.id)}
                            className="text-maroon font-semibold px-1.5"
                          >
                            Yakin?
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 px-1">
                            ✕
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(g.id)}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-maroon hover:bg-maroon hover:text-white transition"
                          title="Hapus nilai"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={() => openAddModal(s)} className="btn-outline text-sm px-4 py-2 whitespace-nowrap">
                  + Tambah Nilai
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <GradeModal
        student={modalStudent}
        editingGrade={editingGrade}
        onClose={() => {
          setModalStudent(null);
          setEditingGrade(null);
        }}
        onSubmit={handleSubmitGrade}
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
