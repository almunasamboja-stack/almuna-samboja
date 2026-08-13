// Kartu peserta dalam grid absensi (Avatar + Nama), berubah warna sesuai status
import { resolveImageUrl } from '../utils/media';

const STATUS_STYLES = {
  PRESENT: 'border-green-500 bg-green-50',
  SICK: 'border-yellow-400 bg-yellow-50',
  ALPHA: 'border-red-500 bg-red-50',
  null: 'border-slate-200 bg-white hover:border-gold',
};

const STATUS_BADGE = {
  PRESENT: { label: 'Hadir', className: 'bg-green-500 text-white' },
  SICK: { label: 'Sakit', className: 'bg-yellow-400 text-white' },
  ALPHA: { label: 'Alpha', className: 'bg-red-500 text-white' },
};

export default function AttendanceCard({ student, onClick }) {
  const badge = STATUS_BADGE[student.status];

  return (
    <button
      onClick={() => onClick(student)}
      disabled={!!student.status}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
        STATUS_STYLES[student.status]
      } ${student.status ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {badge && (
        <span
          className={`absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
      )}
      <img
        src={resolveImageUrl(student.avatarUrl)}
        alt={student.name}
        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
      />
      <div className="text-center">
        <p className="text-sm font-semibold text-navy leading-tight">{student.name}</p>
        <p className="text-xs text-slate-500">{student.class}</p>
      </div>
    </button>
  );
}
