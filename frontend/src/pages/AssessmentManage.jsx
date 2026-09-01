// Halaman admin/guru: input nilai Assessment (Speaking, Listening, Vocabulary, Reading, Grammar) per bulan
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const CATEGORIES = [
  { key: 'speaking', label: 'Speaking' },
  { key: 'listening', label: 'Listening' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'reading', label: 'Reading' },
  { key: 'grammar', label: 'Grammar' },
];

const now = new Date();

export default function AssessmentManage() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [students, setStudents] = useState([]);
  const [edited, setEdited] = useState({}); // { studentId: { speaking, listening, ..., notes } }
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [activeCourseId, periodMonth, periodYear]);

  async function loadAssessments() {
    setLoading(true);
    try {
      const params = { month: periodMonth, year: periodYear };
      if (activeCourseId !== 'ALL') params.courseId = activeCourseId;
      const { data } = await api.get('/assessments', { params });
      setStudents(data.students);
      setEdited({});
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

  function getValue(student, field) {
    if (edited[student.studentId]?.[field] !== undefined) return edited[student.studentId][field];
    return student[field] ?? '';
  }

  function updateField(studentId, field, value) {
    setEdited((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  async function handleSaveRow(student) {
    setSavingId(student.studentId);
    try {
      const payload = {
        courseId: activeCourseId !== 'ALL' ? activeCourseId : undefined,
        periodMonth,
        periodYear,
        speaking: getValue(student, 'speaking'),
        listening: getValue(student, 'listening'),
        vocabulary: getValue(student, 'vocabulary'),
        reading: getValue(student, 'reading'),
        grammar: getValue(student, 'grammar'),
        notes: getValue(student, 'notes'),
      };
      await api.put(`/assessments/${student.studentId}`, payload);
      showToast(`Nilai ${student.name} berhasil disimpan.`);
      await loadAssessments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan nilai');
    } finally {
      setSavingId(null);
    }
  }

  function computeAverage(student) {
    const raw = CATEGORIES.map((c) => getValue(student, c.key)).filter((v) => v !== '' && v !== null && v !== undefined);
    if (raw.length === 0) return '-';
    const sum = raw.reduce((s, v) => s + Number(v), 0);
    return Math.round((sum / raw.length) * 10) / 10;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Laporan Assessment</h1>
          <p className="text-slate-500 text-sm mt-1">
            Nilai Speaking, Listening, Vocabulary, Reading, dan Grammar per siswa, per bulan.
          </p>
        </div>

        {/* FILTER PERIODE */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <select className="input-field !w-auto" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="input-field !w-auto" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
          <p className="text-slate-400">Memuat data...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama Siswa</th>
                  {CATEGORIES.map((c) => (
                    <th key={c.key} className="pb-3 font-medium text-center">{c.label}</th>
                  ))}
                  <th className="pb-3 font-medium text-center">Rata-rata</th>
                  <th className="pb-3 font-medium">Catatan</th>
                  <th className="pb-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-navy whitespace-nowrap">{s.name}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c.key} className="py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={getValue(s, c.key)}
                          onChange={(e) => updateField(s.studentId, c.key, e.target.value)}
                          className="w-16 text-center rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </td>
                    ))}
                    <td className="py-3 text-center font-semibold text-navy">{computeAverage(s)}</td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={getValue(s, 'notes')}
                        onChange={(e) => updateField(s.studentId, 'notes', e.target.value)}
                        placeholder="Catatan (opsional)"
                        className="w-40 rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleSaveRow(s)}
                        disabled={savingId === s.studentId}
                        className="text-navy font-medium hover:text-gold transition disabled:opacity-50"
                      >
                        {savingId === s.studentId ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      Tidak ada siswa disetujui di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
