// Halaman admin: rekap nilai & kehadiran per kelas, dengan fitur unduh ke Excel
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';

export default function AdminReports() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [recap, setRecap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadRecap(activeCourseId);
  }, [activeCourseId]);

  async function loadRecap(courseId) {
    setLoading(true);
    try {
      const params = courseId && courseId !== 'ALL' ? { courseId } : {};
      const { data } = await api.get('/reports/class-recap', { params });
      setRecap(data.students);
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

  const activeCourseName =
    activeCourseId === 'ALL' ? 'Semua Kelas' : courses.find((c) => String(c.id) === activeCourseId)?.name || '';

  function handleDownloadExcel() {
    const rows = recap.map((r) => ({
      Nama: r.name,
      Email: r.email,
      Kelas: r.className,
      Kategori: r.category,
      Hadir: r.present,
      Sakit: r.sick,
      Alpha: r.alpha,
      'Total Absensi Tercatat': r.totalAttendance,
      '% Kehadiran': r.attendancePercentage,
      'Rata-rata Nilai Harian': r.dailyAverage ?? '-',
      'Rata-rata Nilai Bulanan': r.monthlyAverage ?? '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 26 }, { wch: 22 }, { wch: 16 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
      { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap');

    const fileName = `Rekap-${activeCourseName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Rekap Per Kelas</h1>
            <p className="text-slate-500 text-sm mt-1">Ringkasan nilai & jumlah kehadiran siswa per kelas.</p>
          </div>
          <button
            onClick={handleDownloadExcel}
            disabled={recap.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            ⬇ Download Excel
          </button>
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
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama</th>
                  {activeCourseId === 'ALL' && <th className="pb-3 font-medium">Kelas</th>}
                  <th className="pb-3 font-medium text-center">Hadir</th>
                  <th className="pb-3 font-medium text-center">Sakit</th>
                  <th className="pb-3 font-medium text-center">Alpha</th>
                  <th className="pb-3 font-medium text-center">% Kehadiran</th>
                  <th className="pb-3 font-medium text-center">Rata Nilai Harian</th>
                  <th className="pb-3 font-medium text-center">Rata Nilai Bulanan</th>
                </tr>
              </thead>
              <tbody>
                {recap.map((r) => (
                  <tr key={r.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-navy">{r.name}</td>
                    {activeCourseId === 'ALL' && <td className="py-3 text-slate-500">{r.className}</td>}
                    <td className="py-3 text-center text-green-600 font-semibold">{r.present}</td>
                    <td className="py-3 text-center text-yellow-600 font-semibold">{r.sick}</td>
                    <td className="py-3 text-center text-maroon font-semibold">{r.alpha}</td>
                    <td className="py-3 text-center font-semibold text-navy">{r.attendancePercentage}%</td>
                    <td className="py-3 text-center">{r.dailyAverage ?? '-'}</td>
                    <td className="py-3 text-center">{r.monthlyAverage ?? '-'}</td>
                  </tr>
                ))}
                {recap.length === 0 && (
                  <tr>
                    <td colSpan={activeCourseId === 'ALL' ? 8 : 7} className="py-6 text-center text-slate-400">
                      Belum ada data siswa pada kelas ini.
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
