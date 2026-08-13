// Modal pop-up ketika guru mengklik kartu siswa: pilih HADIR / SAKIT / ALPHA
import { useState } from 'react';
import WhatsAppToggle from './WhatsAppToggle';
import { resolveImageUrl } from '../utils/media';

const OPTIONS = [
  { status: 'PRESENT', label: 'HADIR', emoji: '✅', className: 'bg-green-500 hover:bg-green-600' },
  { status: 'SICK', label: 'SAKIT', emoji: '🤒', className: 'bg-yellow-400 hover:bg-yellow-500' },
  { status: 'ALPHA', label: 'ALPHA', emoji: '❌', className: 'bg-red-500 hover:bg-red-600' },
];

export default function AttendanceModal({ student, onClose, onSubmit, submitting }) {
  const [notify, setNotify] = useState(true);

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-[fadeIn_0.15s_ease-out]">
        <div className="flex items-center gap-3 mb-5">
          <img
            src={resolveImageUrl(student.avatarUrl)}
            alt={student.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
          />
          <div>
            <h3 className="font-bold text-navy text-lg leading-tight">{student.name}</h3>
            <p className="text-sm text-slate-500">{student.class}</p>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-600 mb-3">Pilih status kehadiran:</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.status}
              disabled={submitting}
              onClick={() => onSubmit(student.studentId, opt.status, notify)}
              className={`flex flex-col items-center gap-1 text-white font-bold py-4 rounded-xl transition disabled:opacity-60 ${opt.className}`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-xs tracking-wide">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-5">
          <WhatsAppToggle checked={notify} onChange={setNotify} />
        </div>

        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 transition"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
