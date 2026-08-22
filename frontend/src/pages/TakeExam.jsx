// Halaman siswa mengerjakan ujian: baca soal dari Google Drive (embed) + isi jawaban + hasil otomatis
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'];

export default function TakeExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionNumber: 'A' }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // attempt hasil submit

  useEffect(() => {
    api
      .get(`/student-exams/${id}`)
      .then(({ data }) => setExam(data.exam))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat ujian'))
      .finally(() => setLoading(false));
  }, [id]);

  function selectAnswer(questionNumber, letter) {
    setAnswers((prev) => ({ ...prev, [questionNumber]: letter }));
  }

  async function handleSubmit() {
    const totalAnswered = Object.keys(answers).length;
    if (totalAnswered < exam.totalQuestions) {
      const confirmSubmit = window.confirm(
        `Baru ${totalAnswered} dari ${exam.totalQuestions} soal yang dijawab. Tetap submit sekarang?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionNumber, selectedAnswer]) => ({
          questionNumber: Number(questionNumber),
          selectedAnswer,
        })),
      };
      const { data } = await api.post(`/student-exams/${id}/submit`, payload);
      setResult(data.attempt);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal submit ujian');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-10">
          <p className="text-slate-400">Memuat ujian...</p>
        </main>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-10">
          <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 max-w-md">{error}</div>
        </main>
      </div>
    );
  }

  // TAMPILAN HASIL setelah submit
  if (result) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-10 flex justify-center">
          <div className="card w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-gold/20 text-gold flex items-center justify-center text-3xl mx-auto mb-4">
              🎉
            </div>
            <h1 className="text-xl font-bold text-navy mb-1">Ujian Selesai!</h1>
            <p className="text-slate-500 text-sm mb-6">{exam.title}</p>

            <div className="bg-surface rounded-xl p-6 mb-6">
              <p className="text-4xl font-extrabold text-navy mb-1">{result.score}</p>
              <p className="text-sm text-slate-500">
                Benar {result.correctCount} dari {result.totalQuestions} soal
              </p>
            </div>

            <div className="flex gap-3">
              <Link to={`/student-exams/results/${result.id}`} className="btn-outline flex-1 text-center">
                Review Jawaban
              </Link>
              <button onClick={() => navigate('/student-exams')} className="btn-primary flex-1">
                Kembali
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // TAMPILAN MENGERJAKAN UJIAN
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-navy">{exam.title}</h1>
          <p className="text-slate-500 text-sm">
            {exam.totalQuestions} soal{exam.durationMinutes ? ` · Batas waktu ${exam.durationMinutes} menit` : ''}
          </p>
        </div>

        {error && <div className="bg-red-50 text-maroon text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* SOAL - embed Google Drive */}
          <div className="card !p-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 py-1">Lembar Soal</p>
            <iframe
              src={`https://drive.google.com/file/d/${exam.driveFileId}/preview`}
              title="Soal Ujian"
              className="w-full rounded-lg border border-slate-100"
              style={{ height: '70vh' }}
              allow="autoplay"
            />
          </div>

          {/* FORM JAWABAN */}
          <div className="card">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Lembar Jawaban</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-[55vh] overflow-y-auto pr-1">
              {Array.from({ length: exam.totalQuestions }, (_, i) => i + 1).map((num) => (
                <div key={num} className="border border-slate-100 rounded-lg p-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">No. {num}</p>
                  <div className="flex gap-1">
                    {ANSWER_OPTIONS.map((letter) => (
                      <button
                        key={letter}
                        onClick={() => selectAnswer(num, letter)}
                        className={`w-8 h-8 rounded-md text-xs font-bold transition ${
                          answers[num] === letter ? 'bg-gold text-navy' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Terjawab: {Object.keys(answers).length} / {exam.totalQuestions}
            </p>

            <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Mengirim...' : 'Submit Jawaban'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
