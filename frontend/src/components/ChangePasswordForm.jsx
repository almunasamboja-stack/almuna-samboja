// Form ganti password, dipakai bersama oleh admin, guru, dan siswa
import { useState } from 'react';
import api from '../api/axios';

export default function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Konfirmasi password baru tidak cocok');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password berhasil diperbarui.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengganti password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2.5">{success}</div>}

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Password Saat Ini</label>
        <input
          type="password"
          required
          className="input-field"
          value={form.currentPassword}
          onChange={(e) => update('currentPassword', e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Password Baru</label>
        <input
          type="password"
          required
          minLength={6}
          className="input-field"
          value={form.newPassword}
          onChange={(e) => update('newPassword', e.target.value)}
          placeholder="Minimal 6 karakter"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Konfirmasi Password Baru</label>
        <input
          type="password"
          required
          minLength={6}
          className="input-field"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
        />
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Menyimpan...' : 'Ganti Password'}
      </button>
    </form>
  );
}
