// Halaman Pelanggaran Bahasa - guru/admin centang pelanggaran per siswa per kelas per tanggal.
// Jenis pelanggaran (nama + keterangan) dikelola khusus admin: tambah, edit, hapus.
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../utils/media';

const EMPTY_TYPE_FORM = { name: '', description: '' };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function ViolationsManage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(''); // '' = belum pilih kelas, wajib pilih dulu
  const [date, setDate] = useState(todayInputValue());
  const [types, setTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null); // `${studentId}-${typeId}` yang lagi diproses
  const [toast, setToast] = useState(null);

  // Modal kelola jenis pelanggaran (khusus admin)
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [typeError, setTypeError] = useState('');
  const [confirmDeleteTypeId, setConfirmDeleteTypeId] = useState(null);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
    loadTypes();
  }, []);

  useEffect(() => {
    if (activeCourseId) loadChecklist();
    else setStudents([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId, date]);

  async function loadTypes() {
    try {
      const { data } = await api.get('/violations/types');
      setTypes(data.types);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadChecklist() {
    setLoading(true);
    try {
      const { data } = await api.get('/violations', { params: { courseId: activeCourseId, date } });
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

  const courseTabsByCategory = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  // Centang/hapus centang 1 jenis pelanggaran untuk 1 siswa - optimistic update biar terasa instan,
  // di-rollback (muat ulang) kalau request-nya gagal.
  async function handleToggle(studentId, typeId) {
    const key = `${studentId}-${typeId}`;
    setTogglingKey(key);
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const checked = s.checkedTypeIds.includes(typeId);
        return {
          ...s,
          checkedTypeIds: checked
            ? s.checkedTypeIds.filter((id) => id !== typeId)
            : [...s.checkedTypeIds, typeId],
        };
      })
    );
    try {
      await api.post('/violations/toggle', {
        studentId,
        courseId: activeCourseId,
        violationTypeId: typeId,
        date,
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan, coba lagi');
      await loadChecklist(); // rollback ke data server
    } finally {
      setTogglingKey(null);
    }
  }

  // ===== Kelola jenis pelanggaran (admin) =====
  function openAddTypeModal() {
    setEditingTypeId(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setTypeError('');
    setTypeModalOpen(true);
  }

  function openEditTypeModal(t) {
    setEditingTypeId(t.id);
    setTypeForm({ name: t.name, description: t.description || '' });
    setTypeError('');
    setTypeModalOpen(true);
  }

  async function handleTypeSubmit(e) {
    e.preventDefault();
    setTypeError('');
    setTypeSubmitting(true);
    try {
      if (editingTypeId) {
        await api.put(`/violations/types/${editingTypeId}`, typeForm);
        showToast('Jenis pelanggaran berhasil diperbarui.');
      } else {
        await api.post('/violations/types', typeForm);
        showToast('Jenis pelanggaran berhasil ditambahkan.');
      }
      setTypeModalOpen(false);
      await loadTypes();
      if (activeCourseId) await loadChecklist();
    } catch (err) {
      setTypeError(err.response?.data?.message || 'Gagal menyimpan jenis pelanggaran');
    } finally {
      setTypeSubmitting(false);
    }
  }

  async function handleDeleteType(typeId) {
    try {
      await api.delete(`/violations/types/${typeId}`);
      showToast('Jenis pelanggaran berhasil dihapus.');
      await loadTypes();
      if (activeCourseId) await loadChecklist();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus jenis pelanggaran');
    } finally {
      setConfirmDeleteTypeId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Pelanggaran Bahasa</h1>
            <p className="text-slate-500 text-sm mt-1">
              Centang jenis pelanggaran bahasa untuk tiap siswa, per kelas dan tanggal.
            </p>
          </div>
          {isAdmin && (
            <button onClick={openAddTypeModal} className="btn-primary whitespace-nowrap">
              + Tambah Jenis Pelanggaran
            </button>
          )}
        </div>

        {/* KELOLA JENIS PELANGGARAN */}
        {types.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Jenis Pelanggaran</p>
            <div className="card !p-0 divide-y divide-slate-100">
              {types.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      <button onClick={() => openEditTypeModal(t)} className="text-navy font-medium hover:text-gold transition">
                        Edit
                      </button>
                      {confirmDeleteTypeId === t.id ? (
                        <>
                          <button onClick={() => handleDeleteType(t.id)} className="text-maroon font-semibold">Yakin?</button>
                          <button onClick={() => setConfirmDeleteTypeId(null)} className="text-slate-400">Batal</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteTypeId(t.id)} className="text-maroon font-medium hover:underline">
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {types.length === 0 && (
          <div className="mb-8">
            <p className="text-sm text-slate-400">
              Belum ada jenis pelanggaran.{isAdmin ? ' Klik "+ Tambah Jenis Pelanggaran" untuk membuat yang pertama.' : ' Hubungi admin untuk menambahkan jenis pelanggaran.'}
            </p>
          </div>
        )}

        {/* PILIH KELAS & TANGGAL */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Pilih Kelas</label>
            <select
              value={activeCourseId}
              onChange={(e) => setActiveCourseId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">-- Pilih kelas --</option>
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
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayInputValue()}
              className="input-field !w-auto"
            />
          </div>
        </div>

        {!activeCourseId ? (
          <p className="text-slate-400">Pilih kelas di atas untuk mulai mencatat pelanggaran.</p>
        ) : types.length === 0 ? (
          <p className="text-slate-400">Tambahkan jenis pelanggaran dulu sebelum mencatat checklist.</p>
        ) : loading ? (
          <p className="text-slate-400">Memuat data siswa...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: `${280 + types.length * 140}px` }}>
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium sticky left-0 bg-white">Nama Siswa</th>
                  {types.map((t) => (
                    <th key={t.id} className="pb-3 font-medium text-center px-2" title={t.description || ''}>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 flex items-center gap-2 font-medium text-navy whitespace-nowrap sticky left-0 bg-white">
                      <img src={resolveImageUrl(s.avatarUrl)} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                      {s.name}
                    </td>
                    {types.map((t) => {
                      const checked = s.checkedTypeIds.includes(t.id);
                      const key = `${s.studentId}-${t.id}`;
                      return (
                        <td key={t.id} className="py-3 text-center px-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={togglingKey === key}
                            onChange={() => handleToggle(s.studentId, t.id)}
                            className="w-5 h-5 rounded border-slate-300 text-maroon focus:ring-maroon cursor-pointer disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={types.length + 1} className="py-6 text-center text-slate-400">
                      Belum ada siswa disetujui di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL TAMBAH/EDIT JENIS PELANGGARAN */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <h3 className="text-lg font-bold text-navy mb-4">
              {editingTypeId ? 'Edit Jenis Pelanggaran' : 'Tambah Jenis Pelanggaran'}
            </h3>

            {typeError && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{typeError}</div>}

            <form onSubmit={handleTypeSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nama Pelanggaran</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Misal: Bicara Bahasa Indonesia"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Keterangan (opsional)</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Jelaskan kapan pelanggaran ini berlaku, atau sanksinya"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTypeModalOpen(false)} className="flex-1 btn-outline" disabled={typeSubmitting}>
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={typeSubmitting}>
                  {typeSubmitting ? 'Menyimpan...' : 'Simpan'}
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
