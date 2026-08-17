// Halaman admin: catat & kelola pembayaran SPP, plus download Excel rekap SPP bulanan
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const METHOD_LABEL = { CASH: 'Tunai', TRANSFER: 'Transfer' };

const now = new Date();
const EMPTY_FORM = {
  studentId: '',
  courseId: '',
  amount: '',
  periodMonth: now.getMonth() + 1,
  periodYear: now.getFullYear(),
  paymentDate: now.toISOString().slice(0, 10),
  method: 'CASH',
  notes: '',
};

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api
      .get('/students')
      .then(({ data }) => setStudents(data.students.filter((s) => s.status === 'APPROVED')))
      .catch(() => setStudents([]));
  }, []);

  useEffect(() => {
    loadPayments();
  }, [periodMonth, periodYear]);

  async function loadPayments() {
    setLoading(true);
    try {
      const { data } = await api.get('/payments', { params: { month: periodMonth, year: periodYear } });
      setPayments(data.payments);
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

  const totalTerkumpul = payments.reduce((sum, p) => sum + p.amount, 0);

  function openAddModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, periodMonth, periodYear });
    setError('');
    setModalOpen(true);
  }

  function openEditModal(p) {
    setEditingId(p.id);
    setForm({
      studentId: p.student.id,
      courseId: p.course?.id || '',
      amount: p.amount,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      paymentDate: p.paymentDate.slice(0, 10),
      method: p.method,
      notes: p.notes || '',
    });
    setError('');
    setModalOpen(true);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Ambil daftar kelas milik siswa yang sedang dipilih, untuk dropdown kelas & auto-isi nominal
  const selectedStudent = students.find((s) => String(s.id) === String(form.studentId));
  const studentCourses = selectedStudent ? selectedStudent.enrollments.map((e) => e.course) : [];

  function handleCourseChange(courseId) {
    update('courseId', courseId);
    const course = studentCourses.find((c) => String(c.id) === String(courseId));
    if (course) update('amount', course.fee);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        studentId: form.studentId,
        courseId: form.courseId || null,
        amount: Number(form.amount),
        periodMonth: Number(form.periodMonth),
        periodYear: Number(form.periodYear),
        paymentDate: form.paymentDate,
        method: form.method,
        notes: form.notes,
      };
      if (editingId) {
        await api.put(`/payments/${editingId}`, payload);
        showToast('Pembayaran berhasil diperbarui.');
      } else {
        await api.post('/payments', payload);
        showToast('Pembayaran berhasil dicatat.');
      }
      setModalOpen(false);
      await loadPayments();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/payments/${id}`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
      showToast('Pembayaran berhasil dihapus.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus pembayaran');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function handleDownloadExcel() {
    const rows = payments.map((p) => ({
      'Nama Siswa': p.student.user.name,
      Email: p.student.user.email,
      Kelas: p.course?.name || '-',
      'Jumlah (Rp)': p.amount,
      'Periode': `${MONTHS[p.periodMonth - 1]} ${p.periodYear}`,
      'Tanggal Bayar': new Date(p.paymentDate).toLocaleDateString('id-ID'),
      Metode: METHOD_LABEL[p.method],
      Keterangan: p.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 26 }, { wch: 20 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SPP');

    const fileName = `SPP-${MONTHS[periodMonth - 1]}-${periodYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Pembayaran SPP</h1>
            <p className="text-slate-500 text-sm mt-1">Catat dan kelola pembayaran SPP bulanan siswa.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadExcel} disabled={payments.length === 0} className="btn-outline disabled:opacity-50">
              ⬇ Download Excel
            </button>
            <button onClick={openAddModal} className="btn-primary">
              + Catat Pembayaran
            </button>
          </div>
        </div>

        {/* FILTER PERIODE */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <select
            className="input-field !w-auto"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="input-field !w-auto"
            value={periodYear}
            onChange={(e) => setPeriodYear(Number(e.target.value))}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="card !p-3 ml-auto text-center min-w-[180px]">
            <p className="text-xs text-slate-400">Total Terkumpul</p>
            <p className="text-lg font-bold text-navy">{formatRupiah(totalTerkumpul)}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat data pembayaran...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama Siswa</th>
                  <th className="pb-3 font-medium">Kelas</th>
                  <th className="pb-3 font-medium text-right">Jumlah</th>
                  <th className="pb-3 font-medium">Tanggal Bayar</th>
                  <th className="pb-3 font-medium">Metode</th>
                  <th className="pb-3 font-medium">Keterangan</th>
                  <th className="pb-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-navy">{p.student.user.name}</td>
                    <td className="py-3 text-slate-500">{p.course?.name || '-'}</td>
                    <td className="py-3 text-right font-semibold">{formatRupiah(p.amount)}</td>
                    <td className="py-3">{new Date(p.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.method === 'CASH' ? 'bg-gold/20 text-navy' : 'bg-leaf/10 text-leaf'}`}>
                        {METHOD_LABEL[p.method]}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{p.notes || '-'}</td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => openEditModal(p)} className="text-navy font-medium hover:text-gold transition">
                        Edit
                      </button>
                      {confirmDeleteId === p.id ? (
                        <>
                          <button onClick={() => handleDelete(p.id)} className="text-maroon font-semibold">Yakin?</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Batal</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(p.id)} className="text-maroon font-medium hover:underline">
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Belum ada pembayaran tercatat untuk periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <h3 className="text-lg font-bold text-navy mb-4">{editingId ? 'Edit Pembayaran' : 'Catat Pembayaran Baru'}</h3>

            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Siswa</label>
                <select
                  required
                  disabled={!!editingId}
                  className="input-field disabled:bg-slate-100"
                  value={form.studentId}
                  onChange={(e) => update('studentId', e.target.value)}
                >
                  <option value="">-- Pilih siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Kelas (opsional)</label>
                <select
                  className="input-field"
                  value={form.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  <option value="">-- Tidak spesifik --</option>
                  {(editingId
                    ? [{ id: form.courseId, name: payments.find((p) => p.id === editingId)?.course?.name }]
                    : studentCourses
                  ).map((c) => c.id && (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Bulan SPP</label>
                  <select className="input-field" value={form.periodMonth} onChange={(e) => update('periodMonth', e.target.value)}>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Tahun</label>
                  <input type="number" className="input-field" value={form.periodYear} onChange={(e) => update('periodYear', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Jumlah Dibayar (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="input-field"
                  value={form.amount}
                  onChange={(e) => update('amount', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={form.paymentDate}
                  onChange={(e) => update('paymentDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Metode Pembayaran</label>
                <div className="flex gap-3">
                  {['CASH', 'TRANSFER'].map((m) => (
                    <label key={m} className={`flex-1 text-center py-2.5 rounded-lg border-2 cursor-pointer text-sm font-medium transition ${
                      form.method === m ? 'border-gold bg-gold/10 text-navy' : 'border-slate-200 text-slate-500'
                    }`}>
                      <input type="radio" name="method" value={m} checked={form.method === m} onChange={() => update('method', m)} className="hidden" />
                      {METHOD_LABEL[m]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Keterangan (opsional)</label>
                <input
                  className="input-field"
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Contoh: dibayar melalui BCA a.n. ..."
                />
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
