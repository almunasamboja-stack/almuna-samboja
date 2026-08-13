# Almuna Samboja — Sistem Manajemen Kursus & Absensi

Stack: **React (Vite) + Tailwind CSS** (frontend) · **Node.js (Express) + Prisma + SQLite** (backend).

```
almuna-samboja/
├── backend/     # API Express + Prisma
└── frontend/    # React + Vite + Tailwind
```

## ⚠️ Update Terbaru — Skema Database Berubah

Jika sebelumnya Anda sudah pernah menjalankan `npx prisma migrate dev` dengan versi project yang lama,
**hapus dulu database lama** sebelum migrasi ulang, supaya tidak ada konflik:

```bash
cd backend
rm -f prisma/dev.db prisma/dev.db-journal
```

(Windows: hapus file `dev.db` dan `dev.db-journal` di dalam folder `backend/prisma/` lewat File Explorer.)

## 1. Menjalankan Backend

```bash
cd backend
npm install
cp .env.example .env          # sesuaikan jika perlu (default sudah jalan untuk dev)

npx prisma generate
npx prisma migrate dev --name init   # membuat database SQLite (dev.db) & tabel

npm run seed                  # isi akun contoh + 10 kelas kursus + data dummy
npm run dev                   # jalan di http://localhost:4000
```

**Akun contoh (password semua: `password123`):**
- Admin: `admin@almunasamboja.id`
- Guru: `guru@almunasamboja.id`
- Siswa (APPROVED): `siswa1@almunasamboja.id` s/d `siswa10@almunasamboja.id`
- Pendaftar (PENDING, untuk uji fitur persetujuan): `pendaftar1@almunasamboja.id`, `pendaftar2@almunasamboja.id`

## 2. Menjalankan Frontend

Di terminal baru:

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL sudah menunjuk ke backend lokal
npm run dev                   # jalan di http://localhost:5173
```

Buka `http://localhost:5173` di browser.

## 3. Fitur-Fitur Utama

### Untuk Pendaftar / Siswa
- Daftar akun baru (`/register`), pilih salah satu dari 10 kelas kursus yang tersedia.
  Akun baru berstatus **Menunggu Persetujuan** sampai disetujui admin.
- Setelah login, siswa punya dashboard (`/user`) dengan 3 tab: Profil Saya (termasuk
  ganti/hapus foto profil, edit biodata, dan ganti password), Rekap Absensi, dan Nilai.

### Untuk Guru
- Halaman Absensi (`/dashboard`): grid kartu siswa (hanya yang sudah **disetujui admin**
  yang muncul) → klik kartu → pilih HADIR/SAKIT/ALPHA → simulasi notifikasi WhatsApp ke
  orang tua muncul di **console log terminal backend**.
- **Nilai Harian** (`/grades`): pilih kelas via tab, lalu tambah/edit/hapus nilai harian
  per siswa (mata pelajaran + nilai 0-100).
- Profil Saya (`/profile`): kelola foto profil & ganti password sendiri.

### Untuk Admin
- **Kelola Siswa** (`/admin/students`): tambah/edit/hapus siswa, **setujui/tolak pendaftar
  baru**, ganti kelas kursus siswa, kelola foto profil siswa.
- **Kelola Kursus** (`/admin/courses`): tambah/edit/hapus detail kursus (biaya, jadwal,
  kuota, tenggat pendaftaran), dikelompokkan per kategori/tab — bisa buat kategori baru
  bebas dengan mengetik nama kategori baru saat menambah kursus.
- **Nilai Harian** (`/grades`): admin juga bisa input/edit/hapus nilai harian siswa,
  sama seperti guru.
- **Kelola Galeri** (`/admin/gallery`): unggah/hapus foto kegiatan yang tampil otomatis
  di halaman utama.
- **Rekap Kelas** (`/admin/reports`): lihat rekap nilai & jumlah kehadiran (Hadir/Sakit/Alpha)
  per kelas, bisa difilter per tab kelas, dan **download ke Excel (.xlsx)** dengan satu klik.
- **Profil Saya** (`/profile`): kelola foto profil & ganti password sendiri.

Semua foto (profil & galeri) diunggah ke folder `backend/uploads/` dan disajikan lewat
`http://localhost:4000/uploads/...` — tidak perlu konfigurasi tambahan untuk development.

## 4. Mengganti ke WhatsApp API Sungguhan

Edit `backend/src/services/whatsappService.js` — ganti isi fungsi `sendAttendanceNotification`
dengan pemanggilan API asli (contoh Fonnte sudah dicontohkan dalam komentar di file tersebut),
lalu isi `WHATSAPP_API_KEY` dan `WHATSAPP_API_URL` di `backend/.env`.

## 5. Ganti Database ke PostgreSQL (Production)

Di `backend/prisma/schema.prisma`, ubah:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
Lalu set `DATABASE_URL` di `.env` ke connection string PostgreSQL Anda dan jalankan
`npx prisma migrate dev` lagi. Untuk production, sebaiknya folder `uploads/` juga dipindah
ke layanan penyimpanan file seperti S3/Cloudinary alih-alih disk lokal.

## 6. Catatan

- Autentikasi menggunakan JWT, token disimpan di `localStorage` (key `as_token`).
  Route `/dashboard` (guru/admin), `/user` (siswa), `/profile`, dan `/admin/*` dilindungi
  lewat `ProtectedRoute` di frontend dan middleware `auth.js` di backend.
- Foto profil default (sebelum diunggah) memakai placeholder `i.pravatar.cc`.
- Struktur folder mengikuti pemisahan `components/ pages/ context/ utils/` (frontend) dan
  `routes/ controllers/ models(prisma)/ middleware/ services/` (backend).
