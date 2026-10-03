// Halaman guru/admin: buat surat laporan formal per siswa (nama, kelas, absensi, rata nilai ujian,
// pelanggaran, catatan guru), bisa difilter per kelas dan dipilih siswa mana saja yang mau dicetak.
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const now = new Date();
const todayLabel = `${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

function formatTanggal(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function StudentLetterReport() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [monthMode, setMonthMode] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [courseInfo, setCourseInfo] = useState(null);
  const [period, setPeriod] = useState(null);
  const [letters, setLetters] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (!courseId) {
      setLetters([]);
      setCourseInfo(null);
      setSelectedIds(new Set());
      return;
    }
    loadLetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, monthMode, month, year]);

  async function loadLetters() {
    setLoading(true);
    try {
      const params = { courseId };
      if (monthMode) {
        params.month = month;
        params.year = year;
      }
      const { data } = await api.get('/reports/student-letters', { params });
      setCourseInfo(data.course);
      setPeriod(data.period);
      setLetters(data.letters);
      setSelectedIds(new Set(data.letters.map((l) => l.studentId)));
    } catch (err) {
      console.error(err);
      setLetters([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(studentId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === letters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(letters.map((l) => l.studentId)));
    }
  }

  const selectedLetters = letters.filter((l) => selectedIds.has(l.studentId));

  return (
    <div className="min-h-screen flex flex-col">
      <div className="no-print">
        <Navbar />
      </div>

      <main className="flex-1 container mx-auto px-4 py-10 no-print">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Surat Laporan Siswa</h1>
          <p className="text-slate-500 text-sm mt-1">
            Buat surat laporan formal (absensi, nilai ujian, pelanggaran, catatan guru) untuk dikirim ke orang tua/wali.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Pilih Kelas</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="input-field min-w-[220px]"
            >
              <option value="">-- Pilih Kelas --</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Periode Data</label>
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

          {letters.length > 0 && (
            <button
              onClick={() => window.print()}
              disabled={selectedLetters.length === 0}
              className="btn-primary disabled:opacity-50 ml-auto"
            >
              🖨 Cetak / Simpan PDF ({selectedLetters.length})
            </button>
          )}
        </div>

        {!courseId && (
          <p className="text-slate-400">Pilih kelas terlebih dahulu untuk menampilkan daftar siswa.</p>
        )}

        {courseId && loading && <p className="text-slate-400">Memuat data...</p>}

        {courseId && !loading && letters.length === 0 && (
          <p className="text-slate-400">Belum ada siswa aktif pada kelas ini.</p>
        )}

        {courseId && !loading && letters.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === letters.length && letters.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="pb-3 font-medium">Nama</th>
                  <th className="pb-3 font-medium text-center">% Kehadiran</th>
                  <th className="pb-3 font-medium text-center">Rata Nilai Ujian</th>
                  <th className="pb-3 font-medium text-center">Pelanggaran</th>
                  <th className="pb-3 font-medium text-center">Catatan Guru</th>
                </tr>
              </thead>
              <tbody>
                {letters.map((l) => (
                  <tr key={l.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(l.studentId)}
                        onChange={() => toggleSelect(l.studentId)}
                      />
                    </td>
                    <td className="py-3 font-medium text-navy">{l.name}</td>
                    <td className="py-3 text-center">{l.attendance.percentage}%</td>
                    <td className="py-3 text-center">{l.examAverage ?? '-'}</td>
                    <td className="py-3 text-center">
                      {l.violations.length > 0 ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-maroon">
                          {l.violations.length} kali
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Tidak ada</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-slate-500">
                      {l.teacherNote ? 'Ada' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* AREA SURAT - hanya terlihat saat print, satu halaman per siswa terpilih */}
      <div className="print-area">
        {selectedLetters.map((l) => (
          <div key={l.studentId} className="letter-page">
            <div className="letter-header">
              <img src="/images/logo.png" alt="Logo Almuna Samboja" className="letter-logo" />
              <div>
                <h2>ALMUNA SAMBOJA</h2>
                <p>Lembaga Kursus Terpadu Samboja</p>
              </div>
            </div>
            <hr className="letter-divider" />

            <p className="letter-date">Samboja, {todayLabel}</p>
            <p className="letter-subject"><strong>Perihal:</strong> Laporan Perkembangan Siswa</p>

            <p className="letter-to">
              Kepada Yth.<br />
              Orang Tua / Wali dari <strong>{l.name}</strong><br />
              di Tempat
            </p>

            <p>
              Dengan hormat, berikut kami sampaikan laporan perkembangan putra/putri Bapak/Ibu selama mengikuti
              kegiatan di Almuna Samboja{period ? ` untuk periode ${period.label}` : ''}:
            </p>

            <table className="letter-table">
              <tbody>
                <tr><td>Nama Lengkap</td><td>:</td><td>{l.name}</td></tr>
                <tr><td>Kelas</td><td>:</td><td>{l.className}</td></tr>
                <tr>
                  <td>Kehadiran</td><td>:</td>
                  <td>
                    Hadir {l.attendance.present}, Sakit {l.attendance.sick}, Izin {l.attendance.izin}, Alpha {l.attendance.alpha}
                    {' '}({l.attendance.percentage}% dari {l.attendance.total} pertemuan tercatat)
                  </td>
                </tr>
                <tr><td>Rata-rata Nilai Ujian</td><td>:</td><td>{l.examAverage ?? '-'}</td></tr>
              </tbody>
            </table>

            <p className="letter-section-title">Pelanggaran:</p>
            {l.violations.length > 0 ? (
              <ul className="letter-list">
                {l.violations.map((v, idx) => (
                  <li key={idx}>
                    {formatTanggal(v.date)} — {v.typeName}
                    {v.notes ? ` (${v.notes})` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="letter-empty">Tidak ada catatan pelanggaran.</p>
            )}

            <p className="letter-section-title">Catatan Guru:</p>
            <p>{l.teacherNote || 'Tidak ada catatan tambahan dari guru.'}</p>

            <p className="letter-closing">
              Demikian laporan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
            </p>

            <div className="letter-signature">
              <p>Hormat kami,</p>
              <div className="letter-signature-space" />
              <p>Almuna Samboja</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .print-area { display: none; }

        @media print {
          .no-print { display: none !important; }
          .print-area { display: block; }
          .letter-page {
            page-break-after: always;
            padding: 24px;
            font-family: 'Times New Roman', serif;
            color: #111;
            font-size: 13px;
            line-height: 1.6;
          }
          .letter-page:last-child { page-break-after: auto; }
          .letter-header { display: flex; align-items: center; gap: 12px; }
          .letter-logo { width: 56px; height: 56px; object-fit: contain; }
          .letter-header h2 { margin: 0; font-size: 18px; letter-spacing: 1px; }
          .letter-header p { margin: 0; font-size: 12px; }
          .letter-divider { border: none; border-top: 2px solid #111; margin: 10px 0 20px; }
          .letter-date { text-align: right; margin-bottom: 4px; }
          .letter-subject { margin-bottom: 16px; }
          .letter-to { margin-bottom: 16px; }
          .letter-table { border-collapse: collapse; margin: 12px 0 16px; }
          .letter-table td { padding: 3px 6px 3px 0; vertical-align: top; }
          .letter-table td:first-child { white-space: nowrap; }
          .letter-section-title { font-weight: bold; margin-bottom: 4px; }
          .letter-list { margin: 0 0 12px; padding-left: 20px; }
          .letter-empty { margin-bottom: 12px; color: #444; }
          .letter-closing { margin-top: 16px; }
          .letter-signature { margin-top: 24px; text-align: right; }
          .letter-signature-space { height: 60px; }
        }
      `}</style>
    </div>
  );
}
