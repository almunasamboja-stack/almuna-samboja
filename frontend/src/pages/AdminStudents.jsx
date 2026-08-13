// Halaman admin: kelola data siswa (tambah, edit, hapus, setujui/tolak pendaftar, kelola foto)
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AvatarManager from '../components/AvatarManager';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

const EMPTY_FORM = { name: '', email: '', password: '', courseId: '', address: '', parentPhone: '' };

const STATUS_TABS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: 'REJECTED', label: 'Ditolak' },
];

const STATUS_BADGE = {
  PENDING: 'bg-gold/20 text-navy',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-maroon',
};
const STATUS_LABEL = { PENDING: 'Menunggu', APPROVED: 'Disetujui', REJECTED: 'Ditolak' };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null = mode tambah
  const [form, setForm] = useState(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadStudents();
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const { data } = await api.get('/students');
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

  const grouped = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const filteredStudents = students.filter((s) => statusFilter === 'ALL' || s.status === statusFilter);

  function openAddModal() {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setAvatarFile(null);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setForm({
      name: student.user.name,
      email: student.user.email,
      password: '',
      courseId: student.course?.id || '',
      address: student.address,
      parentPhone: student.parentPhone,
    });
    setAvatarFile(null);
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
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, {
          name: form.name,
          courseId: form.courseId || null,
          address: form.address,
          parentPhone: form.parentPhone,
        });
        showToast('Data siswa berhasil diperbarui.');
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        if (avatarFile) fd.append('avatar', avatarFile);
        await api.post('/students', fd);
        showToast('Siswa baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data siswa');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/students/${id}`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      showToast('Siswa berhasil dihapus.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus siswa');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const { data } = await api.patch(`/students/${id}/status`, { status });
      setStudents((prev) => prev.map((s) => (s.id === id ? data.student : s)));
      showToast(status === 'APPROVED' ? 'Pendaftar disetujui.' : 'Pendaftar ditolak.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memperbarui status');
    }
  }

  // Foto siswa dikelola lewat endpoint akun (userId), bukan studentId
  async function handleAvatarUpload(userId, file) {
    const fd = new FormData();
    fd.append('avatar', file);
    const { data } = await api.post(`/users/${userId}/avatar`, fd);
    setStudents((prev) =>
      prev.map((s) => (s.user.id === userId ? { ...s, user: { ...s.user, avatarUrl: data.user.avatarUrl } } : s))
    );
    showToast('Foto profil siswa berhasil diperbarui.');
  }

  async function handleAvatarDelete(userId) {
    const { data } = await api.delete(`/users/${userId}/avatar`);
    setStudents((prev) =>
      prev.map((s) => (s.user.id === userId ? { ...s, user: { ...s.user, avatarUrl: data.user.avatarUrl } } : s))
    );
    showToast('Foto profil siswa berhasil dihapus.');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Kelola Data Siswa</h1>
            <p className="text-slate-500 text-sm mt-1">Tambah, ubah, hapus, dan setujui pendaftaran siswa.</p>
          </div>
          <button onClick={openAddModal} className="btn-primary">
            + Tambah Siswa
          </button>
        </div>

        {/* FILTER STATUS */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
                statusFilter === t.key
                  ? 'bg-navy border-navy text-white'
                  : 'border-slate-200 text-slate-500 hover:border-navy hover:text-navy'
              }`}
            >
              {t.label}
              {t.key !== 'ALL' && (
                <span className="ml-1.5 opacity-70">({students.filter((s) => s.status === t.key).length})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat data siswa...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Kelas</th>
                  <th className="pb-3 font-medium">No. HP Ortu</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 flex items-center gap-2">
                      <img src={resolveImageUrl(s.user.avatarUrl)} alt={s.user.name} className="w-8 h-8 rounded-full object-cover" />
                      {s.user.name}
                    </td>
                    <td className="py-3 text-slate-500">{s.user.email}</td>
                    <td className="py-3">{s.course?.name || '-'}</td>
                    <td className="py-3">{s.parentPhone}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      {s.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleStatusChange(s.id, 'APPROVED')} className="text-green-600 font-medium hover:underline">
                            Setujui
                          </button>
                          <button onClick={() => handleStatusChange(s.id, 'REJECTED')} className="text-maroon font-medium hover:underline">
                            Tolak
                          </button>
                        </>
                      )}
                      <button onClick={() => openEditModal(s)} className="text-navy font-medium hover:text-gold transition">
                        Edit
                      </button>
                      {confirmDeleteId === s.id ? (
                        <>
                          <button onClick={() => handleDelete(s.id)} className="text-maroon font-semibold">Yakin?</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Batal</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(s.id)} className="text-maroon font-medium hover:underline">
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Tidak ada data siswa pada kategori ini.
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
            <h3 className="text-lg font-bold text-navy mb-4">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            {error && (
              <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>
            )}

            {editingStudent && (
              <div className="mb-5 flex justify-center">
                <AvatarManager
                  avatarUrl={editingStudent.user.avatarUrl}
                  size="w-20 h-20"
                  onUpload={(file) => handleAvatarUpload(editingStudent.user.id, file)}
                  onDelete={() => handleAvatarDelete(editingStudent.user.id)}
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nama Lengkap</label>
                <input required className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>

              {!editingStudent && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      className="input-field"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="input-field"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Minimal 6 karakter"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Foto Profil (opsional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="input-field"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Kelas Kursus</label>
                <select className="input-field" value={form.courseId} onChange={(e) => update('courseId', e.target.value)}>
                  <option value="">-- Pilih kelas --</option>
                  {Object.entries(grouped).map(([category, list]) => (
                    <optgroup key={category} label={category}>
                      {list.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Alamat</label>
                <input className="input-field" value={form.address} onChange={(e) => update('address', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">No. HP Orang Tua</label>
                <input className="input-field" value={form.parentPhone} onChange={(e) => update('parentPhone', e.target.value)} />
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
