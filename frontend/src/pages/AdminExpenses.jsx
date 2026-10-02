// Halaman admin: catat & kelola pengeluaran kebutuhan kursus (ATK, operasional, sewa, gaji, dll)
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const now = new Date();
const EMPTY_FORM = {
  title: '',
  category: 'Umum',
  amount: '',
  courseId: '',
  date: now.toISOString().slice(0, 10),
  notes: '',
};

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function AdminExpenses() {
  const [courses, setCourses] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState(true); // true = per bulan, false = semua periode
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMode, periodMonth, periodYear, activeCourseId, activeCategory]);

  async function loadExpenses() {
    setLoading(true);
    try {
      const params = {
        ...(periodMode ? { month: periodMonth, year: periodYear } : {}),
        ...(activeCourseId !== 'ALL' ? { courseId: activeCourseId } : {}),
        ...(activeCategory !== 'ALL' ? { category: activeCategory } : {}),
      };
      const { data } = await api.get('/expenses', { params });
      setExpenses(data.expenses);
      setTotal(data.total);
      setCategories(data.categories);
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

  function openAddModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: now.toISOString().slice(0, 10) });
    setError('');
    setModalOpen(true);
  }

  function openEditModal(e) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      category: e.category,
      amount: e.amount,
      courseId: e.course?.id || '',
      date: e.date.slice(0, 10),
      notes: e.notes || '',
    });
    setError('');
    setModalOpen(true);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        courseId: form.courseId || null,
        date: form.date,
        notes: form.notes,
      };
      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
        showToast('Pengeluaran berhasil diperbarui.');
      } else {
        await api.post('/expenses', payload);
        showToast('Pengeluaran berhasil dicatat.');
      }
      setModalOpen(false);
      await loadExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pengeluaran');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast('Pengeluaran berhasil dihapus.');
      await loadExpenses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus pengeluaran');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function handleDownloadExcel() {
    const rows = expenses.map((e) => ({
      Tanggal: new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      Keperluan: e.title,
      Kategori: e.category,
      Kelas: e.course?.name || '-',
      'Jumlah (Rp)': e.amount,
      Keterangan: e.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 28 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengeluaran');

    const label = periodMode ? `${MONTHS[periodMonth - 1]}-${periodYear}` : 'Semua-Periode';
    XLSX.writeFile(workbook, `Pengeluaran-${label}.xlsx`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Pengeluaran</h1>
            <p className="text-slate-500 text-sm mt-1">Catat dan kelola pengeluaran untuk kebutuhan kursus.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadExcel} disabled={expenses.length === 0} className="btn-outline disabled:opacity-50">
              ⬇ Download Excel
            </button>
            <button onClick={openAddModal} className="btn-primary whitespace-nowrap">
              + Catat Pengeluaran
            </button>
          </div>
        </div>

        {/* FILTER PERIODE, KELAS, KATEGORI */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Periode</label>
            <div className="flex gap-2">
              <select
                value={periodMode ? 'BULAN' : 'SEMUA'}
                onChange={(e) => setPeriodMode(e.target.value === 'BULAN')}
                className="input-field"
              >
                <option value="SEMUA">Semua Periode</option>
                <option value="BULAN">Per Bulan</option>
              </select>
              {periodMode && (
                <>
                  <select className="input-field" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select className="input-field" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))}>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Kelas</label>
            <select value={activeCourseId} onChange={(e) => setActiveCourseId(e.target.value)} className="input-field !w-auto">
              <option value="ALL">Semua Kelas</option>
              {Object.entries(courseTabsByCategory).map(([category, list]) => (
                <optgroup key={category} label={category}>
                  {list.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Kategori</label>
              <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="input-field !w-auto">
                <option value="ALL">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div className="card !p-3 ml-auto text-center min-w-[180px]">
            <p className="text-xs text-slate-400">Total Pengeluaran</p>
            <p className="text-lg font-bold text-maroon">{formatRupiah(total)}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat data pengeluaran...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium">Keperluan</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium">Kelas</th>
                  <th className="pb-3 font-medium text-right">Jumlah</th>
                  <th className="pb-3 font-medium">Keterangan</th>
                  <th className="pb-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 text-slate-500 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 font-medium text-navy">{e.title}</td>
                    <td className="py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold/20 text-navy">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{e.course?.name || '-'}</td>
                    <td className="py-3 text-right font-semibold text-maroon">{formatRupiah(e.amount)}</td>
                    <td className="py-3 text-slate-500">{e.notes || '-'}</td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => openEditModal(e)} className="text-navy font-medium hover:text-gold transition">
                        Edit
                      </button>
                      {confirmDeleteId === e.id ? (
                        <>
                          <button onClick={() => handleDelete(e.id)} className="text-maroon font-semibold">Yakin?</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Batal</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(e.id)} className="text-maroon font-medium hover:underline">
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Belum ada pengeluaran tercatat untuk filter ini.
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
            <h3 className="text-lg font-bold text-navy mb-4">{editingId ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</h3>

            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Keperluan</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Contoh: Beli Spidol & Kertas HVS"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Kategori</label>
                <input
                  type="text"
                  list="expense-categories"
                  className="input-field"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  placeholder="Contoh: ATK, Operasional, Sewa, Gaji"
                />
                <datalist id="expense-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Kelas (opsional)</label>
                <select className="input-field" value={form.courseId} onChange={(e) => update('courseId', e.target.value)}>
                  <option value="">-- Tidak spesifik --</option>
                  {Object.entries(courseTabsByCategory).map(([category, list]) => (
                    <optgroup key={category} label={category}>
                      {list.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Jumlah (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input-field"
                  value={form.amount}
                  onChange={(e) => update('amount', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Keterangan (opsional)</label>
                <input
                  className="input-field"
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Catatan tambahan"
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
