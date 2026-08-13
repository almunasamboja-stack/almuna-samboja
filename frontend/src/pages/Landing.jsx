import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';
import { resolveImageUrl } from '../utils/media';

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Landing() {
  const [courses, setCourses] = useState([]);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses)).catch(() => setCourses([]));
    api.get('/gallery').then(({ data }) => setGallery(data.photos)).catch(() => setGallery([]));
  }, []);

  // Kelompokkan kursus per kategori supaya rapi meski jumlah kelas banyak
  const groupedCourses = courses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-navy">
          <div className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
            <div className="flex justify-center md:justify-start">
              <div className="w-56 h-56 md:w-72 md:h-72 rounded-2xl bg-gold/10 flex items-center justify-center shadow-2xl p-4">
                <img
                  src="/images/mascot.png"
                  alt="Maskot Almuna Samboja"
                  className="w-full h-full object-contain drop-shadow-xl"
                />
              </div>
            </div>
            <div className="text-white text-center md:text-left">
              <p className="text-gold font-semibold tracking-wide mb-2">Selamat Datang di</p>
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">Almuna Samboja</h1>
              <p className="text-slate-100 mb-6 max-w-lg">
                Lembaga kursus terpadu yang membina siswa dengan sistem absensi digital,
                pemantauan nilai real-time, dan komunikasi langsung ke orang tua via WhatsApp.
              </p>
              <div className="flex gap-3 justify-center md:justify-start">
                <Link to="/register" className="btn-primary">Daftar Sekarang</Link>
                <Link to="/login" className="border-2 border-white text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-white hover:text-navy transition">
                  Masuk
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* GALERI */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-navy mb-2">Galeri Kegiatan</h2>
          <p className="text-slate-500 mb-8">Momen-momen belajar dan kebersamaan di Almuna Samboja.</p>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gallery.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-xl aspect-square group">
                  <img
                    src={resolveImageUrl(photo.imageUrl)}
                    alt={photo.caption || 'Kegiatan Almuna Samboja'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Belum ada foto kegiatan yang ditambahkan.</p>
          )}
        </section>

        {/* DETAIL KURSUS */}
        <section className="container mx-auto px-4 pb-20">
          <h2 className="text-2xl font-bold text-navy mb-2">Detail Kursus</h2>
          <p className="text-slate-500 mb-8">Informasi biaya, jadwal, dan kuota pendaftaran per kelas.</p>

          {Object.keys(groupedCourses).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedCourses).map(([category, list]) => (
                <div key={category} className="card">
                  <span className="text-xs font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full inline-block mb-3">
                    {category}
                  </span>
                  <ul className="divide-y divide-slate-100">
                    {list.map((c) => (
                      <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                        <p className="font-semibold text-navy text-sm mb-1">{c.name}</p>
                        <p className="text-xs text-slate-500">Biaya: <span className="font-medium text-slate-700">{formatRupiah(c.fee)}</span></p>
                        <p className="text-xs text-slate-500">Jadwal: <span className="font-medium text-slate-700">{c.schedule}</span></p>
                        <p className="text-xs text-slate-500">
                          Kuota: <span className="font-medium text-slate-700">{c.quota ?? '-'} siswa</span>
                          {c.registrationDeadline && (
                            <> &middot; Tenggat: <span className="font-medium text-slate-700">{formatDate(c.registrationDeadline)}</span></>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Memuat data kursus...</p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
