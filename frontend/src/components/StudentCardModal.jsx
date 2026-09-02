// Modal Kartu Siswa - tampilan kartu identitas, bisa diunduh sebagai gambar JPG
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { resolveImageUrl } from '../utils/media';

function courseNames(student) {
  if (!student.enrollments || student.enrollments.length === 0) return 'Belum ada kelas';
  return student.enrollments.map((e) => e.course.name).join(', ');
}

export default function StudentCardModal({ student, onClose }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!student) return null;

  const nomorInduk = `AS-${String(student.id).padStart(4, '0')}`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // resolusi tinggi supaya hasil JPG tajam
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `Kartu-Siswa-${student.user.name.replace(/\s+/g, '-')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('Gagal membuat gambar kartu:', err);
      alert('Gagal mengunduh kartu. Coba lagi.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-0 my-8">
        {/* AREA YANG DI-CAPTURE JADI GAMBAR */}
        <div ref={cardRef} className="rounded-t-2xl overflow-hidden">
          <div className="bg-navy p-4 flex items-center gap-3">
            <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div className="text-white leading-tight">
              <p className="font-bold text-sm">ALMUNA SAMBOJA</p>
              <p className="text-[10px] text-slate-200">Kartu Tanda Siswa</p>
            </div>
          </div>

          <div className="bg-white p-5 flex gap-4">
            <img
              src={resolveImageUrl(student.user.avatarUrl)}
              alt={student.user.name}
              crossOrigin="anonymous"
              className="w-24 h-28 object-cover rounded-lg border-2 border-gold shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-navy text-base leading-tight mb-2 break-words">{student.user.name}</p>
              <table className="text-xs w-full">
                <tbody>
                  <tr>
                    <td className="text-slate-500 py-0.5 align-top w-16">No. Induk</td>
                    <td className="py-0.5 font-medium text-navy">: {nomorInduk}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 py-0.5 align-top">Kelas</td>
                    <td className="py-0.5 font-medium text-navy">: {courseNames(student)}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 py-0.5 align-top">No. HP Ortu</td>
                    <td className="py-0.5 font-medium text-navy">: {student.parentPhone}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 py-0.5 align-top">Alamat</td>
                    <td className="py-0.5 font-medium text-navy break-words">: {student.address}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gold/10 px-5 py-2.5 text-center">
            <p className="text-[10px] text-navy font-medium">
              Kartu ini adalah identitas resmi siswa Almuna Samboja
            </p>
          </div>
        </div>

        {/* TOMBOL AKSI */}
        <div className="flex gap-3 p-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 btn-outline">
            Tutup
          </button>
          <button onClick={handleDownload} disabled={downloading} className="flex-1 btn-primary disabled:opacity-50">
            {downloading ? 'Memproses...' : '⬇ Download JPG'}
          </button>
        </div>
      </div>
    </div>
  );
}
