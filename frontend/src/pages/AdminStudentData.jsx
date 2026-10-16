// Halaman admin: lihat, edit, dan hapus SEMUA data yang terkait 1 siswa - nilai harian/bulanan,
// nilai ujian/tugas, absensi, pelanggaran, pembayaran SPP, dan penilaian bulanan.
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const STATUS_LABEL = { PRESENT: 'Hadir', SICK: 'Sakit', IZIN: 'Izin', ALPHA: 'Alpha' };
const METHOD_LABEL = { CASH: 'Tunai', TRANSFER: 'Transfer' };

function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

// Konfigurasi tiap bagian data: kolom tabel, dan field yang bisa diedit.
// endpoint = :type di /api/student-data/:type/:id, dataKey = nama array di respons.
const SECTIONS = [
  {
    key: 'grades',
    endpoint: 'grades',
    dataKey: 'grades',
    label: 'Nilai Harian/Bulanan',
    columns: [
      { label: 'Tanggal', render: (r) => fmtDate(r.date) },
      { label: 'Pelajaran', render: (r) => r.subject },
      { label: 'Jenis', render: (r) => (r.type === 'DAILY' ? 'Harian' : 'Bulanan') },
      { label: 'Nilai', render: (r) => <span className="font-semibold text-navy">{r.score}</span> },
      { label: 'Catatan', render: (r) => r.notes || '-' },
    ],
    fields: [
      { key: 'subject', label: 'Mata Pelajaran', type: 'text', required: true },
      { key: 'type', label: 'Jenis Nilai', type: 'select', options: [{ value: 'DAILY', label: 'Harian' }, { value: 'MONTHLY', label: 'Bulanan' }] },
      { key: 'score', label: 'Nilai (0-100)', type: 'number', min: 0, max: 100, step: 'any', required: true },
      { key: 'date', label: 'Tanggal', type: 'date', required: true },
      { key: 'notes', label: 'Catatan', type: 'textarea' },
    ],
  },
  {
    key: 'examAttempts',
    endpoint: 'exam-attempts',
    dataKey: 'examAttempts',
    label: 'Nilai Ujian/Tugas',
    columns: [
      { label: 'Tanggal', render: (r) => fmtDate(r.submittedAt) },
      { label: 'Ujian/Tugas', render: (r) => r.exam?.title },
      { label: 'Pelajaran', render: (r) => r.exam?.course?.name || 'Semua Kelas' },
      { label: 'Nilai', render: (r) => <span className="font-semibold text-navy">{r.score}</span> },
      { label: 'Benar', render: (r) => `${r.correctCount}/${r.totalQuestions}` },
    ],
    fields: [
      { key: 'score', label: 'Nilai (0-100)', type: 'number', min: 0, max: 100, step: 'any', required: true },
      { key: 'correctCount', label: 'Jumlah Benar', type: 'number', min: 0, required: true },
      { key: 'totalQuestions', label: 'Total Soal', type: 'number', min: 1, required: true },
      { key: 'submittedAt', label: 'Tanggal Dikerjakan', type: 'date', required: true },
    ],
  },
  {
    key: 'attendances',
    endpoint: 'attendances',
    dataKey: 'attendances',
    label: 'Absensi',
    columns: [
      { label: 'Tanggal', render: (r) => fmtDate(r.date) },
      { label: 'Kelas', render: (r) => r.course?.name || '-' },
      { label: 'Status', render: (r) => STATUS_LABEL[r.status] || r.status },
    ],
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })) },
      { key: 'date', label: 'Tanggal', type: 'date', required: true },
    ],
  },
  {
    key: 'violations',
    endpoint: 'violations',
    dataKey: 'violations',
    label: 'Pelanggaran',
    columns: [
      { label: 'Tanggal', render: (r) => fmtDate(r.date) },
      { label: 'Kelas', render: (r) => r.course?.name || '-' },
      { label: 'Pelanggaran', render: (r) => r.violationType?.name },
      { label: 'Catatan', render: (r) => r.notes || '-' },
    ],
    fields: [
      { key: 'violationTypeId', label: 'Jenis Pelanggaran', type: 'select', numeric: true, options: 'violationTypes' },
      { key: 'date', label: 'Tanggal', type: 'date', required: true },
      { key: 'notes', label: 'Catatan', type: 'textarea' },
    ],
  },
  {
    key: 'payments',
    endpoint: 'payments',
    dataKey: 'payments',
    label: 'Pembayaran SPP',
    columns: [
      { label: 'Tgl Bayar', render: (r) => fmtDate(r.paymentDate) },
      { label: 'Kelas', render: (r) => r.course?.name || '-' },
      { label: 'Periode', render: (r) => `${MONTHS[r.periodMonth - 1]} ${r.periodYear}` },
      { label: 'Jumlah', render: (r) => <span className="font-semibold text-navy">{formatRupiah(r.amount)}</span> },
      { label: 'Metode', render: (r) => METHOD_LABEL[r.method] || r.method },
      { label: 'Keterangan', render: (r) => r.notes || '-' },
    ],
    fields: [
      { key: 'amount', label: 'Jumlah (Rp)', type: 'number', min: 1, required: true },
      { key: 'periodMonth', label: 'Bulan SPP', type: 'select', numeric: true, options: MONTHS.map((m, i) => ({ value: i + 1, label: m })) },
      { key: 'periodYear', label: 'Tahun SPP', type: 'number', min: 2000, max: 2100, required: true },
      { key: 'paymentDate', label: 'Tanggal Bayar', type: 'date', required: true },
      { key: 'method', label: 'Metode', type: 'select', options: [{ value: 'CASH', label: 'Tunai' }, { value: 'TRANSFER', label: 'Transfer' }] },
      { key: 'notes', label: 'Keterangan', type: 'textarea' },
    ],
  },
  {
    key: 'assessments',
    endpoint: 'assessments',
    dataKey: 'assessments',
    label: 'Penilaian Bulanan',
    columns: [
      { label: 'Periode', render: (r) => `${MONTHS[r.periodMonth - 1]} ${r.periodYear}` },
      { label: 'Kelas', render: (r) => r.course?.name || '-' },
      { label: 'Speaking', render: (r) => r.speaking ?? '-' },
      { label: 'Listening', render: (r) => r.listening ?? '-' },
      { label: 'Vocabulary', render: (r) => r.vocabulary ?? '-' },
      { label: 'Reading', render: (r) => r.reading ?? '-' },
      { label: 'Grammar', render: (r) => r.grammar ?? '-' },
      { label: 'Catatan Guru', render: (r) => r.notes || '-' },
    ],
    fields: [
      { key: 'speaking', label: 'Speaking (0-100)', type: 'number', min: 0, max: 100, step: 'any' },
      { key: 'listening', label: 'Listening (0-100)', type: 'number', min: 0, max: 100, step: 'any' },
      { key: 'vocabulary', label: 'Vocabulary (0-100)', type: 'number', min: 0, max: 100, step: 'any' },
      { key: 'reading', label: 'Reading (0-100)', type: 'number', min: 0, max: 100, step: 'any' },
      { key: 'grammar', label: 'Grammar (0-100)', type: 'number', min: 0, max: 100, step: 'any' },
      { key: 'notes', label: 'Catatan Guru', type: 'textarea' },
    ],
  },
];

// Nilai awal form edit dari 1 baris data; field tanggal dipotong jadi YYYY-MM-DD
function buildInitialForm(section, record) {
  const form = {};
  section.fields.forEach((f) => {
    const v = record[f.key];
    if (f.type === 'date') form[f.key] = v ? String(v).slice(0, 10) : '';
    else form[f.key] = v === null || v === undefined ? '' : v;
  });
  return form;
}

export default function AdminStudentData() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeKey, setActiveKey] = useState('grades');
  const [editing, setEditing] = useState(null); // { section, record }
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // `${endpoint}-${id}`
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/students').then(({ data: d }) => setStudents(d.students.filter((s) => s.status === 'APPROVED'))).catch(() => setStudents([]));
    api.get('/courses').then(({ data: d }) => setCourses(d.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (selectedId) loadData(selectedId);
    else setData(null);
  }, [selectedId]);

  async function loadData(studentId) {
    setLoadingData(true);
    try {
      const { data: d } = await api.get(`/student-data/${studentId}`);
      setData(d);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoadingData(false);
    }
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const visibleStudents = students.filter((s) => {
    const matchName = s.user.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchCourse = courseFilter === 'ALL' || s.enrollments.some((e) => String(e.course.id) === courseFilter);
    return matchName && matchCourse;
  });

  const activeSection = SECTIONS.find((s) => s.key === activeKey);
  const rows = data ? data[activeSection.dataKey] : [];

  function openEdit(section, record) {
    setEditing({ section, record });
    setForm(buildInitialForm(section, record));
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { section, record } = editing;
      const payload = {};
      section.fields.forEach((f) => {
        const v = form[f.key];
        if (f.type === 'number' || f.numeric) {
          payload[f.key] = v === '' ? null : Number(v);
        } else {
          payload[f.key] = v;
        }
      });
      await api.put(`/student-data/${section.endpoint}/${record.id}`, payload);
      setEditing(null);
      showToast('Data berhasil diperbarui.');
      await loadData(selectedId);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(section, record) {
    try {
      await api.delete(`/student-data/${section.endpoint}/${record.id}`);
      showToast('Data berhasil dihapus.');
      await loadData(selectedId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus data');
    } finally {
      setConfirmDelete(null);
    }
  }

  function renderField(f) {
    const common = {
      className: 'input-field',
      value: form[f.key] ?? '',
      onChange: (e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value })),
    };
    if (f.type === 'textarea') return <textarea rows={2} {...common} />;
    if (f.type === 'select') {
      const options = f.options === 'violationTypes' ? (data?.violationTypes || []).map((t) => ({ value: t.id, label: t.name })) : f.options;
      return (
        <select required {...common}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return <input type={f.type} required={f.required} min={f.min} max={f.max} step={f.step} {...common} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Data & Nilai Siswa</h1>
          <p className="text-slate-500 text-sm mt-1">
            Lihat, edit, dan hapus semua data yang terkait satu siswa: nilai harian, nilai ujian/tugas, absensi, pelanggaran, SPP, dan penilaian bulanan.
          </p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* DAFTAR SISWA */}
          <div className="card !p-4">
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="input-field mb-2">
              <option value="ALL">Semua Kelas</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari nama siswa..."
              className="input-field mb-3"
            />
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {visibleStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    selectedId === s.id ? 'bg-navy text-white' : 'text-slate-700 hover:bg-surface'
                  }`}
                >
                  {s.user.name}
                </button>
              ))}
              {visibleStudents.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">Tidak ada siswa ditemukan.</p>}
            </div>
          </div>

          {/* DETAIL DATA SISWA */}
          <div className="min-w-0">
            {!selectedId && <p className="text-slate-400">Pilih siswa di sebelah kiri untuk melihat datanya.</p>}
            {selectedId && loadingData && <p className="text-slate-400">Memuat data siswa...</p>}

            {selectedId && !loadingData && data && (
              <>
                <div className="mb-4">
                  <p className="text-lg font-bold text-navy">{data.student.name}</p>
                  <p className="text-xs text-slate-400">
                    {data.student.email}{data.student.courses.length > 0 ? ` · ${data.student.courses.join(', ')}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setActiveKey(s.key)}
                      className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                        activeKey === s.key ? 'border-gold text-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {s.label} ({data[s.dataKey].length})
                    </button>
                  ))}
                </div>

                <div className="card overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100">
                        {activeSection.columns.map((c) => (
                          <th key={c.label} className="pb-3 font-medium">{c.label}</th>
                        ))}
                        <th className="pb-3 font-medium text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50 last:border-0">
                          {activeSection.columns.map((c) => (
                            <td key={c.label} className="py-3 text-slate-600">{c.render(r)}</td>
                          ))}
                          <td className="py-3 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => openEdit(activeSection, r)} className="text-navy font-medium hover:text-gold transition">
                              Edit
                            </button>
                            {confirmDelete === `${activeSection.endpoint}-${r.id}` ? (
                              <>
                                <button onClick={() => handleDelete(activeSection, r)} className="text-maroon font-semibold">Yakin?</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-slate-400">Batal</button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDelete(`${activeSection.endpoint}-${r.id}`)} className="text-maroon font-medium hover:underline">
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={activeSection.columns.length + 1} className="py-6 text-center text-slate-400">
                            Belum ada data {activeSection.label.toLowerCase()} untuk siswa ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <h3 className="text-lg font-bold text-navy mb-4">Edit {editing.section.label}</h3>
            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              {editing.section.fields.map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{f.label}</label>
                  {renderField(f)}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 btn-outline" disabled={submitting}>
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
