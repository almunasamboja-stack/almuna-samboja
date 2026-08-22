// Halaman siswa: daftar ujian tersedia + riwayat hasil
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student-exams').then(({ data }) => setExams(data.exams)).catch(() => setExams([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Ujian Saya</h1>
          <p className="text-slate-500 text-sm mt-1">Daftar ujian yang tersedia untuk Anda kerjakan.</p>
        </div>

        {loading ? (
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
        )}
      </main>
    </div>
  );
}
