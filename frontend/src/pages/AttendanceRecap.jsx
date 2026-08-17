// Halaman "Rekap Absensi Per Tanggal" untuk guru & admin - lihat rekap absensi hari mana pun
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

const STATUS_LABEL = { PRESENT: 'Hadir', SICK: 'Sakit', ALPHA: 'Alpha' };
const STATUS_BADGE = {
  PRESENT: 'bg-green-100 text-green-700',
  SICK: 'bg-yellow-100 text-yellow-700',
  ALPHA: 'bg-red-100 text-maroon',
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceRecap() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [date, setDate] = useState(todayInputValue());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadRecap();
  }, [date, activeCourseId]);

  async function loadRecap() {
    setLoading(true);
    try {
      const params = { date };
      if (activeCourseId !== 'ALL') params.courseId = activeCourseId;
      const { data } = await api.get('/attendance/recap', { params });
      setStudents(data.students);
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

  const hadir = students.filter((s) => s.status === 'PRESENT').length;
  const sakit = students.filter((s) => s.status === 'SICK').length;
  const alpha = students.filter((s) => s.status === 'ALPHA').length;
  const belum = students.filter((s) => !s.status).length;

  function handleDownloadExcel() {
    const rows = students.map((s) => ({
      Nama: s.name,
      Kelas: s.class,
      Status: s.status ? STATUS_LABEL[s.status] : 'Belum diabsen',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 24 }, { wch: 26 }, { wch: 16 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
    XLSX.writeFile(workbook, `Rekap-Absensi-${date}.xlsx`);
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
          <div className="flex items-center gap-3">
            <input
              type="date"
              className="input-field !w-auto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayInputValue()}
            />
            <button onClick={handleDownloadExcel} disabled={students.length === 0} className="btn-outline disabled:opacity-50 whitespace-nowrap">
              ⬇ Download Excel
            </button>
          </div>
        </div>

        {/* RINGKASAN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-green-600">{hadir}</p>
            <p className="text-xs text-slate-500">Hadir</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{sakit}</p>
            <p className="text-xs text-slate-500">Sakit</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-maroon">{alpha}</p>
            <p className="text-xs text-slate-500">Alpha</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-slate-400">{belum}</p>
            <p className="text-xs text-slate-500">Belum Diabsen</p>
          </div>
        </div>

        {/* TAB PILIH KELAS */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveCourseId('ALL')}
            className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
              activeCourseId === 'ALL'
                ? 'bg-navy border-navy text-white'
                : 'border-slate-200 text-slate-500 hover:border-navy hover:text-navy'
            }`}
          >
            Semua Kelas
          </button>
          {Object.entries(courseTabsByCategory).map(([category, list]) => (
            <div key={category} className="contents">
              {list.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCourseId(String(c.id))}
                  title={category}
                  className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
                    activeCourseId === String(c.id)
                      ? 'bg-gold border-gold text-navy'
                      : 'border-slate-200 text-slate-500 hover:border-gold hover:text-navy'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat rekap...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama</th>
                  <th className="pb-3 font-medium">Kelas</th>
                  <th className="pb-3 font-medium">Status</th>
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
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status ? STATUS_BADGE[s.status] : 'bg-slate-100 text-slate-400'}`}>
                        {s.status ? STATUS_LABEL[s.status] : 'Belum diabsen'}
                      </span>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
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
