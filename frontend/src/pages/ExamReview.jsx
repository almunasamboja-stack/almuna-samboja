// Halaman siswa: review jawaban per nomor setelah mengerjakan ujian (fokus ke yang salah)
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

export default function ExamReview() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);

  useEffect(() => {
    api
      .get(`/student-exams/attempts/${attemptId}`)
      .then(({ data }) => setAttempt(data.attempt))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat hasil ujian'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-10">
          <p className="text-slate-400">Memuat hasil ujian...</p>
        </main>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-10">
          <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 max-w-md">{error}</div>
        </main>
      </div>
    );
  }

  const answerKeyMap = {};
  attempt.exam.answerKeys.forEach((k) => {
    answerKeyMap[k.questionNumber] = k.correctAnswer;
  });

  const rows = attempt.answers.map((a) => ({
    questionNumber: a.questionNumber,
    selectedAnswer: a.selectedAnswer,
    correctAnswer: answerKeyMap[a.questionNumber],
    isCorrect: a.isCorrect,
  }));

  const wrongCount = rows.filter((r) => !r.isCorrect).length;
  const visibleRows = showOnlyWrong ? rows.filter((r) => !r.isCorrect) : rows;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-navy">{attempt.exam.title}</h1>
          <Link to="/student-exams" className="text-sm text-navy hover:text-gold transition">
            ← Kembali
          </Link>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          {new Date(attempt.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* RINGKASAN */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card !p-4 text-center">
            <p className="text-2xl font-bold text-navy">{attempt.score}</p>
            <p className="text-xs text-slate-500">Nilai</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{attempt.correctCount}</p>
            <p className="text-xs text-slate-500">Jawaban Benar</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="text-2xl font-bold text-maroon">{wrongCount}</p>
            <p className="text-xs text-slate-500">Jawaban Salah</p>
          </div>
        </div>

        {attempt.exam.driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${attempt.exam.driveFileId}/view`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-navy hover:text-gold transition underline mb-6 inline-block"
          >
            📄 Buka lembar soal untuk dicocokkan
          </a>
        )}

        {/* TOGGLE FILTER */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-navy">Review Jawaban</p>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWrong}
              onChange={(e) => setShowOnlyWrong(e.target.checked)}
              className="rounded border-slate-300 text-gold focus:ring-gold"
            />
            Tampilkan yang salah saja
          </label>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-medium">No.</th>
                <th className="pb-2 font-medium text-center">Jawaban Anda</th>
                <th className="pb-2 font-medium text-center">Jawaban Benar</th>
                <th className="pb-2 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.questionNumber} className={`border-b border-slate-50 last:border-0 ${!r.isCorrect ? 'bg-red-50/40' : ''}`}>
                  <td className="py-2.5 font-medium text-navy">{r.questionNumber}</td>
                  <td className={`py-2.5 text-center font-semibold ${r.isCorrect ? 'text-green-600' : 'text-maroon'}`}>
                    {r.selectedAnswer}
                  </td>
                  <td className="py-2.5 text-center font-semibold text-navy">{r.correctAnswer}</td>
                  <td className="py-2.5 text-center">
                    {r.isCorrect ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Benar</span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-maroon">Salah</span>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    🎉 Semua jawaban Anda benar!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
