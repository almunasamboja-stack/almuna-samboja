// Halaman admin/guru: rekap nilai hasil ujian per anak, difilter per pelajaran (kelas)
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import api from '../api/axios';

export default function ExamResultsRecap() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('ALL');
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    loadRecap();
  }, [activeCourseId]);

  async function loadRecap() {
    setLoading(true);
    try {
      const params = activeCourseId !== 'ALL' ? { courseId: activeCourseId } : {};
      const { data } = await api.get('/exams/results-recap', { params });
      setAttempts(data.attempts);
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

  // Ringkasan rata-rata nilai per anak (untuk kartu di atas tabel)
  const perStudent = {};
  attempts.forEach((a) => {
    if (!perStudent[a.studentId]) perStudent[a.studentId] = { name: a.studentName, scores: [] };
    perStudent[a.studentId].scores.push(a.score);
  });
  const studentSummaries = Object.values(perStudent).map((s) => ({
    name: s.name,
    average: Math.round((s.scores.reduce((sum, v) => sum + v, 0) / s.scores.length) * 10) / 10,
    count: s.scores.length,
  }));

  function handleDownloadExcel() {
    const rows = attempts.map((a) => ({
      'Nama Siswa': a.studentName,
      Pelajaran: a.courseName,
      'Judul Ujian': a.examTitle,
      Nilai: a.score,
      Benar: `${a.correctCount}/${a.totalQuestions}`,
      'Tanggal Dikerjakan': new Date(a.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai Ujian');

    const labelPelajaran = activeCourseId === 'ALL' ? 'Semua-Pelajaran' : (courses.find((c) => String(c.id) === activeCourseId)?.name || 'Pelajaran').replace(/\s+/g, '-');
    XLSX.writeFile(workbook, `Rekap-Nilai-Ujian-${labelPelajaran}.xlsx`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Rekap Nilai Ujian</h1>
            <p className="text-slate-500 text-sm mt-1">Hasil ujian tiap siswa, difilter per pelajaran/kelas.</p>
          </div>
          <button onClick={handleDownloadExcel} disabled={attempts.length === 0} className="btn-outline disabled:opacity-50">
            ⬇ Download Excel
          </button>
        </div>

        {/* TAB PILIH PELAJARAN/KELAS */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveCourseId('ALL')}
            className={`text-sm font-medium px-4 py-2 rounded-full border-2 transition ${
              activeCourseId === 'ALL'
                ? 'bg-navy border-navy text-white'
                : 'border-slate-200 text-slate-500 hover:border-navy hover:text-navy'
            }`}
          >
            Semua Pelajaran
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
          <>
            {/* RINGKASAN RATA-RATA PER ANAK */}
            {studentSummaries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {studentSummaries.map((s) => (
                  <div key={s.name} className="card !p-3 text-center">
                    <p className="text-lg font-bold text-navy">{s.average}</p>
                    <p className="text-xs text-slate-500 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.count} ujian</p>
                  </div>
                ))}
              </div>
            )}

            {/* TABEL DETAIL PER PENGERJAAN */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium">Nama Siswa</th>
                    <th className="pb-3 font-medium">Pelajaran</th>
                    <th className="pb-3 font-medium">Judul Ujian</th>
                    <th className="pb-3 font-medium text-center">Nilai</th>
                    <th className="pb-3 font-medium text-center">Benar</th>
                    <th className="pb-3 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.attemptId} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 font-medium text-navy">{a.studentName}</td>
                      <td className="py-3 text-slate-500">{a.courseName}</td>
                      <td className="py-3 text-slate-500">{a.examTitle}</td>
                      <td className="py-3 text-center font-semibold text-navy">{a.score}</td>
                      <td className="py-3 text-center text-slate-500">{a.correctCount}/{a.totalQuestions}</td>
                      <td className="py-3 text-slate-500">
                        {new Date(a.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Belum ada hasil ujian untuk pelajaran ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
