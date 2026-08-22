// Halaman siswa: daftar ujian tersedia + riwayat hasil (dengan tab)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

export default function StudentExams() {
  const [tab, setTab] = useState('tersedia');
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  useEffect(() => {
    api.get('/student-exams').then(({ data }) => setExams(data.exams)).catch(() => setExams([])).finally(() => setLoadingExams(false));
    api
      .get('/student-exams/attempts/me')
      .then(({ data }) => setAttempts(data.attempts))
      .catch(() => setAttempts([]))
      .finally(() => setLoadingAttempts(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Ujian Saya</h1>
          <p className="text-slate-500 text-sm mt-1">Kerjakan ujian yang tersedia dan lihat hasil pengerjaan Anda.</p>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {[
            { key: 'tersedia', label: 'Ujian Tersedia' },
            { key: 'hasil', label: 'Hasil Ujian' },
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

        {/* TAB 1: UJIAN TERSEDIA */}
        {tab === 'tersedia' && (
          loadingExams ? (
            <p className="text-slate-400">Memuat daftar ujian...</p>
          ) : exams.length === 0 ? (
            <p className="text-slate-400">Belum ada ujian tersedia saat ini.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <div key={exam.id} className="card flex flex-col">
                  <p className="text-xs font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full inline-block mb-3 w-fit">
                    {exam.courseName || 'Semua kelas'}
                  </p>
                  <h3 className="font-bold text-navy mb-1">{exam.title}</h3>
                  {exam.description && <p className="text-sm text-slate-500 mb-3">{exam.description}</p>}
                  <p className="text-xs text-slate-400 mb-4">
                    {exam.totalQuestions} soal{exam.durationMinutes ? ` · ${exam.durationMinutes} menit` : ' · Tanpa batas waktu'}
                  </p>

                  {exam.lastAttempt && (
                    <div className="bg-surface rounded-lg px-3 py-2 mb-4 text-xs">
                      <p className="text-slate-500">Nilai terakhir Anda:</p>
                      <p className="font-bold text-navy text-lg">{exam.lastAttempt.score}</p>
                    </div>
                  )}

                  <Link to={`/student-exams/${exam.id}`} className="btn-primary text-center mt-auto">
                    {exam.lastAttempt ? 'Kerjakan Lagi' : 'Kerjakan Ujian'}
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 2: HASIL UJIAN */}
        {tab === 'hasil' && (
          loadingAttempts ? (
            <p className="text-slate-400">Memuat riwayat hasil...</p>
          ) : attempts.length === 0 ? (
            <p className="text-slate-400">Belum ada ujian yang Anda kerjakan.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium">Ujian</th>
                    <th className="pb-3 font-medium text-center">Nilai</th>
                    <th className="pb-3 font-medium text-center">Benar</th>
                    <th className="pb-3 font-medium">Tanggal</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 font-medium text-navy">{a.exam.title}</td>
                      <td className="py-3 text-center font-semibold text-navy">{a.score}</td>
                      <td className="py-3 text-center text-slate-500">{a.correctCount}/{a.totalQuestions}</td>
                      <td className="py-3 text-slate-500">
                        {new Date(a.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 text-right">
                        <Link to={`/student-exams/results/${a.id}`} className="text-navy font-medium hover:text-gold transition">
                          Review Jawaban
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  );
}
