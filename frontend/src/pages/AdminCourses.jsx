// Halaman admin: kelola detail kursus (biaya, jadwal, kuota, tenggat) dikelompokkan per kategori/tab
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  fee: '',
  schedule: '',
  quota: '',
  registrationDeadline: '',
};

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const { data } = await api.get('/courses');
      setCourses(data.courses);
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

  const categories = ['ALL', ...Array.from(new Set(courses.map((c) => c.category)))];
  const filtered = activeCategory === 'ALL' ? courses : courses.filter((c) => c.category === activeCategory);

  function openAddModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category: activeCategory !== 'ALL' ? activeCategory : '' });
    setError('');
    setModalOpen(true);
  }

  function openEditModal(course) {
    setEditingId(course.id);
    setForm({
      name: course.name,
      description: course.description || '',
      category: course.category,
      fee: course.fee,
      schedule: course.schedule,
      quota: course.quota ?? '',
      registrationDeadline: toDateInputValue(course.registrationDeadline),
    });
    setError('');
    setModalOpen(true);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        category: form.category || 'Umum',
        fee: Number(form.fee),
        quota: form.quota === '' ? null : Number(form.quota),
        registrationDeadline: form.registrationDeadline || null,
      };
      if (editingId) {
        await api.put(`/courses/${editingId}`, payload);
        showToast('Kursus berhasil diperbarui.');
      } else {
        await api.post('/courses', payload);
        showToast('Kursus baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      await loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan kursus');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      showToast('Kursus berhasil dihapus.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus kursus');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Kelola Detail Kursus</h1>
            <p className="text-slate-500 text-sm mt-1">Atur biaya, jadwal, kuota, dan tenggat pendaftaran per kelas.</p>
          </div>
          <button onClick={openAddModal} className="btn-primary">
            + Tambah Kursus
          </button>
        </div>

        {/* TAB KATEGORI */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
                activeCategory === cat
                  ? 'bg-navy border-navy text-white'
                  : 'border-slate-200 text-slate-500 hover:border-navy hover:text-navy'
              }`}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat data kursus...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full">{c.category}</span>
                </div>
                <h3 className="font-bold text-navy mb-1">{c.name}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{c.description}</p>
                <ul className="text-sm text-slate-600 space-y-1 mb-4">
                  <li><span className="text-slate-400">Biaya:</span> <span className="font-medium">{formatRupiah(c.fee)}</span></li>
                  <li><span className="text-slate-400">Jadwal:</span> <span className="font-medium">{c.schedule}</span></li>
                  <li><span className="text-slate-400">Kuota:</span> <span className="font-medium">{c.quota ?? '-'} siswa</span></li>
                  <li>
                    <span className="text-slate-400">Tenggat:</span>{' '}
                    <span className="font-medium">
                      {c.registrationDeadline
                        ? new Date(c.registrationDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '-'}
                    </span>
                  </li>
                </ul>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => openEditModal(c)} className="text-navy font-medium hover:text-gold transition">
                    Edit
                  </button>
                  {confirmDeleteId === c.id ? (
                    <>
                      <button onClick={() => handleDelete(c.id)} className="text-maroon font-semibold">Yakin?</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Batal</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(c.id)} className="text-maroon font-medium hover:underline">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-slate-400 col-span-full text-center py-10">Belum ada kursus pada kategori ini.</p>
            )}
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <h3 className="text-lg font-bold text-navy mb-4">{editingId ? 'Edit Kursus' : 'Tambah Kursus Baru'}</h3>

            {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nama Kursus</label>
                <input required className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Kategori / Tab <span className="text-slate-400 font-normal">(bisa nama baru untuk buat tab baru)</span>
                </label>
                <input
                  required
                  list="category-options"
                  className="input-field"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  placeholder="Contoh: Bahasa Inggris"
                />
                <datalist id="category-options">
                  {categories.filter((c) => c !== 'ALL').map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Deskripsi</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Biaya (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-field"
                    value={form.fee}
                    onChange={(e) => update('fee', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Kuota</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.quota}
                    onChange={(e) => update('quota', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Jadwal</label>
                <input
                  required
                  className="input-field"
                  value={form.schedule}
                  onChange={(e) => update('schedule', e.target.value)}
                  placeholder="Contoh: Senin & Rabu, 15.30 - 17.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Tenggat Pendaftaran</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.registrationDeadline}
                  onChange={(e) => update('registrationDeadline', e.target.value)}
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
