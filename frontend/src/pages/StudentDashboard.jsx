// Halaman privat siswa/orang tua: 3 tab (Profil, Rekap Absensi, Nilai)
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import GradeChart from '../components/GradeChart';
import AvatarManager from '../components/AvatarManager';
import ChangePasswordForm from '../components/ChangePasswordForm';
import api from '../api/axios';

const STATUS_LABEL = { PRESENT: 'Hadir', SICK: 'Sakit', IZIN: 'Izin', ALPHA: 'Alpha' };
const STATUS_COLOR = { PRESENT: 'text-green-600', SICK: 'text-yellow-600', IZIN: 'text-blue-600', ALPHA: 'text-red-600' };
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const APPROVAL_BANNER = {
  PENDING: {
    className: 'bg-gold/10 border-gold text-navy',
    icon: '⏳',
    text: 'Akun Anda masih menunggu persetujuan admin. Sebagian data absensi & nilai belum tersedia sampai disetujui.',
  },
  REJECTED: {
    className: 'bg-red-50 border-maroon text-maroon',
    icon: '⚠️',
    text: 'Pendaftaran Anda belum disetujui admin. Silakan hubungi pihak Almuna Samboja untuk informasi lebih lanjut.',
  },
};

export default function StudentDashboard() {
  const [tab, setTab] = useState('profil');
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [grades, setGrades] = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data: profileData } = await api.get('/students/me');
      setProfile(profileData.student);

      if (profileData.student.status === 'APPROVED') {
        const studentId = profileData.student.id;
        const [{ data: attData }, { data: gradeData }, { data: paymentData }] = await Promise.all([
          api.get(`/attendance/student/${studentId}`),
          api.get(`/grades/student/${studentId}`),
          api.get(`/payments/student/${studentId}`),
        ]);
        setAttendance(attData);
        setGrades(gradeData);
        setPayments(paymentData.payments);
      }
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

  async function handleAvatarUpload(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post('/users/me/avatar', formData);
    setProfile((p) => ({ ...p, user: { ...p.user, avatarUrl: data.user.avatarUrl } }));
    showToast('Foto profil berhasil diperbarui.');
  }

  async function handleAvatarDelete() {
    const { data } = await api.delete('/users/me/avatar');
    setProfile((p) => ({ ...p, user: { ...p.user, avatarUrl: data.user.avatarUrl } }));
    showToast('Foto profil berhasil dihapus.');
  }

  const chartData = (grades?.monthly || []).map((g, i) => ({
    label: `Minggu ${i + 1}`,
    score: g.score,
  }));

  function startEdit() {
    setEditForm({
      name: profile.user.name,
      address: profile.address,
      parentPhone: profile.parentPhone,
    });
    setSaveError('');
    setEditing(true);
  }

  function updateField(field, value) {
    setEditForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await api.put('/students/me', editForm);
      setProfile(data.student);
      setEditing(false);
      showToast('Biodata berhasil diperbarui.');
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Gagal menyimpan biodata');
    } finally {
      setSaving(false);
    }
  }

  const banner = profile ? APPROVAL_BANNER[profile.status] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-navy mb-6">Dashboard Saya</h1>

        {loading ? (
          <p className="text-slate-400">Memuat data...</p>
        ) : (
          <>
            {banner && (
              <div className={`border-2 rounded-xl px-4 py-3 mb-6 text-sm flex items-start gap-3 ${banner.className}`}>
                <span className="text-lg">{banner.icon}</span>
                <span>{banner.text}</span>
              </div>
            )}

            {/* TAB NAV */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
              {[
                { key: 'profil', label: 'Profil Saya' },
                { key: 'absensi', label: 'Rekap Absensi' },
                { key: 'nilai', label: 'Nilai' },
                { key: 'spp', label: 'Riwayat SPP' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                    tab === t.key ? 'border-gold text-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: PROFIL */}
            {tab === 'profil' && profile && !editing && (
              <div className="card max-w-xl">
                <div className="flex flex-col items-center mb-6">
                  <AvatarManager
                    avatarUrl={profile.user.avatarUrl}
                    onUpload={handleAvatarUpload}
                    onDelete={handleAvatarDelete}
                  />
                  <h2 className="text-xl font-bold text-navy mt-3">{profile.user.name}</h2>
                  <p className="text-slate-500 text-sm">{profile.user.email}</p>
                </div>
                <ul className="divide-y divide-slate-100 text-sm mb-5">
                  <li className="py-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-500">Kelas Kursus</span>
                    </div>
                    {profile.enrollments && profile.enrollments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.enrollments.map((e) => (
                          <span key={e.course.id} className="text-xs font-medium bg-gold/10 text-navy px-2.5 py-1 rounded-full">
                            {e.course.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium text-navy">Belum ditentukan</span>
                    )}
                  </li>
                  <li className="py-3 flex justify-between"><span className="text-slate-500">Alamat</span><span className="font-medium text-navy text-right">{profile.address}</span></li>
                  <li className="py-3 flex justify-between"><span className="text-slate-500">No. HP Orang Tua</span><span className="font-medium text-navy">{profile.parentPhone}</span></li>
                  <li className="py-3 flex justify-between"><span className="text-slate-500">Status Pendaftaran</span><span className="font-medium text-navy">{profile.status === 'APPROVED' ? 'Disetujui' : profile.status === 'PENDING' ? 'Menunggu' : 'Ditolak'}</span></li>
                </ul>
                <button onClick={startEdit} className="btn-outline w-full">
                  Edit Biodata
                </button>
              </div>
            )}

            {/* TAB 1: GANTI PASSWORD (selalu tampil di tab profil, terlepas dari mode edit biodata) */}
            {tab === 'profil' && profile && (
              <div className="card max-w-xl mt-6">
                <h2 className="text-lg font-bold text-navy mb-4">Ganti Password</h2>
                <ChangePasswordForm />
              </div>
            )}

            {/* TAB 1: PROFIL - MODE EDIT */}
            {tab === 'profil' && profile && editing && (
              <div className="card max-w-xl">
                <h2 className="text-lg font-bold text-navy mb-4">Edit Biodata</h2>

                {saveError && (
                  <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{saveError}</div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Nama Lengkap</label>
                    <input
                      required
                      className="input-field"
                      value={editForm.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Alamat</label>
                    <input
                      className="input-field"
                      value={editForm.address}
                      onChange={(e) => updateField('address', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">No. HP Orang Tua</label>
                    <input
                      className="input-field"
                      value={editForm.parentPhone}
                      onChange={(e) => updateField('parentPhone', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Perubahan kelas kursus hanya dapat dilakukan oleh admin.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      className="flex-1 btn-outline"
                    >
                      Batal
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 btn-primary">
                      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: REKAP ABSENSI */}
            {tab === 'absensi' && (
              attendance ? (
                <div className="space-y-6">
                  <div className="card max-w-xl">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-navy">Kehadiran Bulan Ini</p>
                      <p className="font-bold text-gold">{attendance.percentage}%</p>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full transition-all"
                        style={{ width: `${attendance.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {attendance.hadir} hadir dari {attendance.totalHari} hari tercatat
                    </p>
                  </div>

                  <div className="card">
                    <p className="font-semibold text-navy mb-4">Riwayat Absensi</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-100">
                          <th className="pb-2 font-medium">Tanggal</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.history.map((h) => (
                          <tr key={h.id} className="border-b border-slate-50 last:border-0">
                            <td className="py-2.5">
                              {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className={`py-2.5 font-medium ${STATUS_COLOR[h.status]}`}>
                              {STATUS_LABEL[h.status]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Data absensi tersedia setelah akun disetujui admin.</p>
              )
            )}

            {/* TAB 3: NILAI */}
            {tab === 'nilai' && (
              grades ? (
                <div className="space-y-6">
                  <div className="card">
                    <p className="font-semibold text-navy mb-4">Nilai Harian</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-100">
                          <th className="pb-2 font-medium">Tanggal</th>
                          <th className="pb-2 font-medium">Mata Pelajaran</th>
                          <th className="pb-2 font-medium text-right">Nilai</th>
                          <th className="pb-2 font-medium">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.daily.map((g) => (
                          <tr key={g.id} className="border-b border-slate-50 last:border-0">
                            <td className="py-2.5">
                              {new Date(g.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="py-2.5">{g.subject}</td>
                            <td className="py-2.5 text-right font-semibold text-navy">{g.score}</td>
                            <td className="py-2.5 text-slate-500">{g.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card">
                    <p className="font-semibold text-navy mb-4">Tren Nilai Bulanan</p>
                    {chartData.length > 0 ? (
                      <GradeChart data={chartData} />
                    ) : (
                      <p className="text-slate-400 text-sm">Belum ada data nilai bulanan.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Data nilai tersedia setelah akun disetujui admin.</p>
              )
            )}

            {/* TAB 4: RIWAYAT SPP */}
            {tab === 'spp' && (
              payments ? (
                <div className="card">
                  <p className="font-semibold text-navy mb-4">Riwayat Pembayaran SPP</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100">
                        <th className="pb-2 font-medium">Periode</th>
                        <th className="pb-2 font-medium">Kelas</th>
                        <th className="pb-2 font-medium text-right">Jumlah</th>
                        <th className="pb-2 font-medium">Tanggal Bayar</th>
                        <th className="pb-2 font-medium">Metode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5">{MONTH_NAMES[p.periodMonth - 1]} {p.periodYear}</td>
                          <td className="py-2.5">{p.course?.name || '-'}</td>
                          <td className="py-2.5 text-right font-semibold text-navy">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.amount)}
                          </td>
                          <td className="py-2.5">{new Date(p.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="py-2.5">{p.method === 'CASH' ? 'Tunai' : 'Transfer'}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">Belum ada riwayat pembayaran.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Data pembayaran tersedia setelah akun disetujui admin.</p>
              )
            )}
          </>
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
