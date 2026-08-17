// Modal untuk menambah/mengedit nilai harian seorang siswa
import { useState, useEffect } from 'react';
import { resolveImageUrl } from '../utils/media';

const SUBJECT_SUGGESTIONS = [
  'Matematika',
  'Bahasa Inggris',
  'Bahasa Arab',
  'Komputer',
  'Membaca',
  'SNBT & PTN',
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function GradeModal({ student, editingGrade, onClose, onSubmit, submitting }) {
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingGrade) {
      setSubject(editingGrade.subject);
      setScore(String(editingGrade.score));
      setDate(editingGrade.date ? editingGrade.date.slice(0, 10) : todayInputValue());
      setNotes(editingGrade.notes || '');
    } else {
      setSubject('');
      setScore('');
      setDate(todayInputValue());
      setNotes('');
    }
    setError('');
  }, [editingGrade, student]);

  if (!student) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const numericScore = Number(score);
    if (!subject.trim()) {
      setError('Mata pelajaran wajib diisi');
      return;
    }
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      setError('Nilai harus berupa angka 0 - 100');
      return;
    }
    if (!date) {
      setError('Tanggal wajib diisi');
      return;
    }
    onSubmit({
      subject: subject.trim(),
      score: numericScore,
      date,
      notes: notes.trim(),
      gradeId: editingGrade?.id,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <img
            src={resolveImageUrl(student.avatarUrl)}
            alt={student.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
          />
          <div>
            <h3 className="font-bold text-navy leading-tight">{student.name}</h3>
            <p className="text-xs text-slate-500">{editingGrade ? 'Edit nilai harian' : 'Tambah nilai harian'}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Mata Pelajaran</label>
            <input
              required
              list="subject-suggestions"
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Matematika"
            />
            <datalist id="subject-suggestions">
              {SUBJECT_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nilai (0 - 100)</label>
              <input
                required
                type="number"
                min="0"
                max="100"
                className="input-field"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Tanggal</label>
              <input
                required
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Keterangan (opsional)</label>
            <textarea
              rows={2}
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: nilai ulangan harian bab 3"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 btn-outline">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="flex-1 btn-primary">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
