// Halaman "Rekap Absensi Per Tanggal" untuk guru & admin - lihat rekap absensi hari mana pun
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

const STATUS_LABEL = { PRESENT: 'Hadir', SICK: 'Sakit', IZIN: 'Izin', ALPHA: 'Alpha' };
const STATUS_BADGE = {
  PRESENT: 'bg-green-100 text-green-700',
  SICK: 'bg-yellow-100 text-yellow-700',
  IZIN: 'bg-blue-100 text-blue-700',
  ALPHA: 'bg-red-100 text-maroon',
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const now = new Date();

export default function AttendanceRecap() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(''); // '' = belum pilih kelas, wajib pilih dulu (absensi per pelajaran)
  const [date, setDate] = useState(todayInputValue());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthMode, setMonthMode] = useState(false); // false = per tanggal, true = per bulan
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (activeCourseId) loadRecap();
    else setStudents([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeCourseId, monthMode, month, year]);

  async function loadRecap() {
    setLoading(true);
    try {
      if (monthMode) {
        const { data } = await api.get('/attendance/recap-month', { params: { month, year, courseId: activeCourseId } });
        setStudents(data.students);
      } else {
        const { data } = await api.get('/attendance/recap', { params: { date, courseId: activeCourseId } });
        setStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const courseTabsByCategory = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const hadir = monthMode
    ? students.reduce((sum, s) => sum + s.present, 0)
    : students.filter((s) => s.status === 'PRESENT').length;
  const sakit = monthMode
    ? students.reduce((sum, s) => sum + s.sick, 0)
    : students.filter((s) => s.status === 'SICK').length;
  const izin = monthMode
    ? students.reduce((sum, s) => sum + s.izin, 0)
    : students.filter((s) => s.status === 'IZIN').length;
  const alpha = monthMode
    ? students.reduce((sum, s) => sum + s.alpha, 0)
    : students.filter((s) => s.status === 'ALPHA').length;
  const belum = students.filter((s) => !s.status).length;

  function handleDownloadExcel() {
    const rows = monthMode
      ? students.map((s) => ({
          Nama: s.name,
          Kelas: s.class,
          Hadir: s.present,
          Sakit: s.sick,
          Izin: s.izin,
          Alpha: s.alpha,
          '% Kehadiran': s.percentage,
        }))
      : students.map((s) => ({
          Nama: s.name,
          Kelas: s.class,
          Status: s.status ? STATUS_LABEL[s.status] : 'Belum diabsen',
        }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = monthMode
      ? [{ wch: 24 }, { wch: 26 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }]
      : [{ wch: 24 }, { wch: 26 }, { wch: 16 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
    const label = monthMode ? `${MONTH_NAMES[month - 1]}-${year}` : date;
    XLSX.writeFile(workbook, `Rekap-Absensi-${label}.xlsx`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Rekap Absensi Per Tanggal</h1>
            <p className="text-slate-500 text-sm mt-1">Lihat rekap kehadiran siswa untuk tanggal mana pun.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={monthMode ? 'BULAN' : 'TANGGAL'}
              onChange={(e) => setMonthMode(e.target.value === 'BULAN')}
              className="input-field !w-auto"
            >
              <option value="TANGGAL">Per Tanggal</option>
              <option value="BULAN">Per Bulan</option>
            </select>
            {monthMode ? (
              <>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field !w-auto">
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>{name}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field !w-auto">
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            ) : (
              <input
                type="date"
                className="input-field !w-auto"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayInputValue()}
              />
            )}
            <button onClick={handleDownloadExcel} disabled={students.length === 0} className="btn-outline disabled:opacity-50 whitespace-nowrap">
              ⬇ Download Excel
            </button>
          </div>
        </div>

        {/* RINGKASAN */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-green-600">{hadir}</p>
            <p className="text-xs text-slate-500">Hadir</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{sakit}</p>
            <p className="text-xs text-slate-500">Sakit</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{izin}</p>
            <p className="text-xs text-slate-500">Izin</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-maroon">{alpha}</p>
            <p className="text-xs text-slate-500">Alpha</p>
          </div>
          {!monthMode && (
            <div className="card !p-3 text-center">
              <p className="text-xl font-bold text-slate-400">{belum}</p>
              <p className="text-xs text-slate-500">Belum Diabsen</p>
            </div>
          )}
        </div>

        {/* PILIH KELAS/MATA PELAJARAN (wajib, dropdown) */}
        <div className="mb-6 max-w-xs">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Pilih Kelas / Mata Pelajaran</label>
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

        {!activeCourseId ? (
          <p className="text-slate-400">Pilih kelas/mata pelajaran di atas untuk melihat rekap absensinya.</p>
        ) : loading ? (
          <p className="text-slate-400">Memuat rekap...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama</th>
                  <th className="pb-3 font-medium">Kelas</th>
                  {monthMode ? (
                    <>
                      <th className="pb-3 font-medium text-center">Hadir</th>
                      <th className="pb-3 font-medium text-center">Sakit</th>
                      <th className="pb-3 font-medium text-center">Izin</th>
                      <th className="pb-3 font-medium text-center">Alpha</th>
                      <th className="pb-3 font-medium text-center">% Kehadiran</th>
                    </>
                  ) : (
                    <th className="pb-3 font-medium">Status</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 flex items-center gap-2 font-medium text-navy">
                      <img src={resolveImageUrl(s.avatarUrl)} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                      {s.name}
                    </td>
                    <td className="py-3 text-slate-500">{s.class}</td>
                    {monthMode ? (
                      <>
                        <td className="py-3 text-center text-green-600 font-semibold">{s.present}</td>
                        <td className="py-3 text-center text-yellow-600 font-semibold">{s.sick}</td>
                        <td className="py-3 text-center text-blue-600 font-semibold">{s.izin}</td>
                        <td className="py-3 text-center text-maroon font-semibold">{s.alpha}</td>
                        <td className="py-3 text-center font-semibold text-navy">{s.percentage}%</td>
                      </>
                    ) : (
                      <td className="py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status ? STATUS_BADGE[s.status] : 'bg-slate-100 text-slate-400'}`}>
                          {s.status ? STATUS_LABEL[s.status] : 'Belum diabsen'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={monthMode ? 7 : 3} className="py-6 text-center text-slate-400">
                      Tidak ada data siswa pada kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
