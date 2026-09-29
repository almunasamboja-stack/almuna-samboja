// Halaman admin: rekap nilai & kehadiran per kelas, dengan fitur unduh ke Excel
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const now = new Date();

export default function AdminReports() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [recap, setRecap] = useState([]);
  const [courseFee, setCourseFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordingSpp, setRecordingSpp] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [monthMode, setMonthMode] = useState(false); // false = semua data, true = per bulan
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadRecap(activeCourseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId, monthMode, month, year]);

  async function loadRecap(courseId) {
    setLoading(true);
    try {
      const params = courseId && courseId !== 'ALL' ? { courseId } : {};
      if (monthMode) {
        params.month = month;
        params.year = year;
      }
      const { data } = await api.get('/reports/class-recap', { params });
      setRecap(data.students);
      setCourseFee(data.courseFee ?? null);
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
      Izin: r.izin,
      Alpha: r.alpha,
      'Total Absensi Tercatat': r.totalAttendance,
      '% Kehadiran': r.attendancePercentage,
      'Rata-rata Nilai Harian': r.dailyAverage ?? '-',
      'Rata-rata Nilai Bulanan': r.monthlyAverage ?? '-',
      ...(activeCourseId !== 'ALL' ? { 'Status SPP Bulan Ini': r.paymentStatus === 'PAID' ? 'Sudah Bayar' : 'Belum Bayar' } : {}),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 26 }, { wch: 22 }, { wch: 16 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
      { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap');

    const fileName = `Rekap-${activeCourseName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleRecordSpp() {
    if (activeCourseId === 'ALL') return;
    const targetMonth = monthMode ? month : now.getMonth() + 1;
    const targetYear = monthMode ? year : now.getFullYear();
    const periodLabel = `${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;
    const confirmMsg = `Catat SPP bulan ${periodLabel} untuk semua siswa di kelas "${activeCourseName}"? Siswa yang sudah tercatat akan dilewati otomatis.`;
    if (!window.confirm(confirmMsg)) return;

    setRecordingSpp(true);
    try {
      const { data } = await api.post('/payments/bulk-record', {
        courseId: activeCourseId,
        periodMonth: targetMonth,
        periodYear: targetYear,
        method: 'CASH',
      });
      showToast(data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mencatat SPP otomatis');
    } finally {
      setRecordingSpp(false);
    }
  }

  async function handlePaySingle(student) {
    if (activeCourseId === 'ALL' || courseFee === null) return;
    setPayingId(student.studentId);
    try {
      await api.post('/payments', {
        studentId: student.studentId,
        courseId: activeCourseId,
        amount: courseFee,
        periodMonth: student.paymentPeriodMonth,
        periodYear: student.paymentPeriodYear,
        paymentDate: new Date().toISOString().slice(0, 10),
        method: 'CASH',
      });
      showToast(`SPP ${student.name} berhasil dicatat.`);
      await loadRecap(activeCourseId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mencatat pembayaran');
    } finally {
      setPayingId(null);
    }
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
          <div className="flex gap-2">
            {activeCourseId !== 'ALL' && (
              <button
                onClick={handleRecordSpp}
                disabled={recordingSpp || recap.length === 0}
                className="btn-outline disabled:opacity-50 whitespace-nowrap"
              >
                {recordingSpp ? 'Memproses...' : '💰 Catat SPP Bulan Ini'}
              </button>
            )}
            <button
              onClick={handleDownloadExcel}
              disabled={recap.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              ⬇ Download Excel
            </button>
          </div>
        </div>

        {/* PILIH KELAS (dropdown) & PERIODE */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Pilih Kelas</label>
            <select
              value={activeCourseId}
              onChange={(e) => setActiveCourseId(e.target.value)}
              className="input-field min-w-[220px]"
            >
              <option value="ALL">Semua Kelas</option>
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
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Periode</label>
            <div className="flex gap-2">
              <select
                value={monthMode ? 'BULAN' : 'SEMUA'}
                onChange={(e) => setMonthMode(e.target.value === 'BULAN')}
                className="input-field"
              >
                <option value="SEMUA">Semua Data</option>
                <option value="BULAN">Per Bulan</option>
              </select>
              {monthMode && (
                <>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field">
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field">
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Memuat rekap...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Nama</th>
                  {activeCourseId === 'ALL' && <th className="pb-3 font-medium">Kelas</th>}
                  <th className="pb-3 font-medium text-center">Hadir</th>
                  <th className="pb-3 font-medium text-center">Sakit</th>
                  <th className="pb-3 font-medium text-center">Izin</th>
                  <th className="pb-3 font-medium text-center">Alpha</th>
                  <th className="pb-3 font-medium text-center">% Kehadiran</th>
                  <th className="pb-3 font-medium text-center">Rata Nilai Harian</th>
                  <th className="pb-3 font-medium text-center">Rata Nilai Bulanan</th>
                  {activeCourseId !== 'ALL' && (
                    <>
                      <th className="pb-3 font-medium text-center">Status SPP</th>
                      <th className="pb-3 font-medium text-right">Aksi</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {recap.map((r) => (
                  <tr key={r.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-navy">{r.name}</td>
                    {activeCourseId === 'ALL' && <td className="py-3 text-slate-500">{r.className}</td>}
                    <td className="py-3 text-center text-green-600 font-semibold">{r.present}</td>
                    <td className="py-3 text-center text-yellow-600 font-semibold">{r.sick}</td>
                    <td className="py-3 text-center text-blue-600 font-semibold">{r.izin}</td>
                    <td className="py-3 text-center text-maroon font-semibold">{r.alpha}</td>
                    <td className="py-3 text-center font-semibold text-navy">{r.attendancePercentage}%</td>
                    <td className="py-3 text-center">{r.dailyAverage ?? '-'}</td>
                    <td className="py-3 text-center">{r.monthlyAverage ?? '-'}</td>
                    {activeCourseId !== 'ALL' && (
                      <>
                        <td className="py-3 text-center">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            r.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-maroon'
                          }`}>
                            {r.paymentStatus === 'PAID' ? 'Sudah Bayar' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {r.paymentStatus === 'UNPAID' && (
                            <button
                              onClick={() => handlePaySingle(r)}
                              disabled={payingId === r.studentId}
                              className="text-navy font-medium hover:text-gold transition disabled:opacity-50 whitespace-nowrap"
                            >
                              {payingId === r.studentId ? 'Memproses...' : '💰 Bayar'}
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {recap.length === 0 && (
                  <tr>
                    <td colSpan={activeCourseId === 'ALL' ? 9 : 10} className="py-6 text-center text-slate-400">
                      Belum ada data siswa pada kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
