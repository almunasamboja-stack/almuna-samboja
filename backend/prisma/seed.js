// Seeder data dummy: 1 admin, 1 guru, 10 kursus (dikelompokkan per kategori),
// 10 siswa berstatus APPROVED, 2 pendaftar contoh berstatus PENDING (untuk uji fitur persetujuan).
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const COURSES = [
  { name: 'Bahasa Inggris Reguler', category: 'Bahasa Inggris', fee: 150000, schedule: 'Senin & Rabu, 15.30 - 17.00', quota: 15 },
  { name: 'Bahasa Inggris Private', category: 'Bahasa Inggris', fee: 300000, schedule: 'Jadwal fleksibel (1-on-1)', quota: 5 },
  { name: 'Bahasa Arab Private', category: 'Bahasa Arab', fee: 300000, schedule: 'Jadwal fleksibel (1-on-1)', quota: 5 },
  { name: 'Matematika Reguler', category: 'Matematika', fee: 150000, schedule: 'Selasa & Kamis, 15.30 - 17.00', quota: 15 },
  { name: 'Matematika Private', category: 'Matematika', fee: 300000, schedule: 'Jadwal fleksibel (1-on-1)', quota: 5 },
  { name: 'Komputer Private', category: 'Komputer', fee: 350000, schedule: 'Jadwal fleksibel (1-on-1)', quota: 5 },
  { name: 'SNBT & PTN', category: 'SNBT & PTN', fee: 400000, schedule: 'Sabtu - Minggu, 09.00 - 11.00', quota: 20 },
  { name: 'Belajar Membaca Paket A', category: 'Belajar Membaca', fee: 100000, schedule: 'Senin - Jumat, 08.00 - 09.00', quota: 10 },
  { name: 'Belajar Membaca Paket B', category: 'Belajar Membaca', fee: 100000, schedule: 'Senin - Jumat, 09.00 - 10.00', quota: 10 },
  { name: 'Belajar Membaca Paket C', category: 'Belajar Membaca', fee: 100000, schedule: 'Senin - Jumat, 10.00 - 11.00', quota: 10 },
];

const STUDENT_NAMES = [
  'Ahmad Fauzi',
  'Siti Nurhaliza',
  'Budi Santoso',
  'Rina Amelia',
  'Dedi Kurniawan',
  'Putri Wulandari',
  'Rizky Ramadhan',
  'Nadia Salsabila',
  'Fajar Hidayat',
  'Aisyah Putri',
];

const PENDING_NAMES = ['Muhammad Iqbal', 'Salsabila Zahra'];

const SUBJECTS = ['Matematika', 'Bahasa Inggris', 'Sains', 'Mengaji', 'Coding Dasar'];

function randomPhone() {
  return '08' + Math.floor(100000000 + Math.random() * 899999999);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Mulai seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@almunasamboja.id' },
    update: {},
    create: {
      name: 'Admin Almuna Samboja',
      email: 'admin@almunasamboja.id',
      passwordHash,
      role: 'ADMIN',
      avatarUrl: 'https://i.pravatar.cc/150?u=admin@almunasamboja.id',
    },
  });

  // Guru
  await prisma.user.upsert({
    where: { email: 'guru@almunasamboja.id' },
    update: {},
    create: {
      name: 'Ustadz Rahman',
      email: 'guru@almunasamboja.id',
      passwordHash,
      role: 'TEACHER',
      avatarUrl: 'https://i.pravatar.cc/150?u=guru@almunasamboja.id',
    },
  });

  // 10 kursus (dikelompokkan per kategori untuk tab di halaman admin)
  const createdCourses = [];
  for (const c of COURSES) {
    let course = await prisma.course.findFirst({ where: { name: c.name } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          name: c.name,
          description: `Kelas ${c.name} di Almuna Samboja.`,
          category: c.category,
          fee: c.fee,
          schedule: c.schedule,
          quota: c.quota,
          registrationDeadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        },
      });
    }
    createdCourses.push(course);
  }

  // 10 siswa APPROVED, tersebar di berbagai kursus
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const name = STUDENT_NAMES[i];
    const email = `siswa${i + 1}@almunasamboja.id`;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) continue;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'STUDENT',
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        student: {
          create: {
            courseId: randomFrom(createdCourses).id,
            address: `Jl. Contoh No. ${i + 1}, Samboja, Kalimantan Timur`,
            parentPhone: randomPhone(),
            status: 'APPROVED',
          },
        },
      },
      include: { student: true },
    });

    const studentId = user.student.id;

    // Nilai harian (5 entri)
    for (let d = 0; d < 5; d++) {
      await prisma.grade.create({
        data: {
          studentId,
          subject: randomFrom(SUBJECTS),
          type: 'DAILY',
          score: Math.floor(70 + Math.random() * 30),
          date: new Date(Date.now() - d * 86400000),
        },
      });
    }

    // Nilai bulanan (4 minggu)
    for (let w = 1; w <= 4; w++) {
      await prisma.grade.create({
        data: {
          studentId,
          subject: 'Rata-rata Mingguan',
          type: 'MONTHLY',
          score: Math.floor(70 + Math.random() * 30),
          date: new Date(new Date().getFullYear(), new Date().getMonth(), w * 7),
        },
      });
    }

    // Riwayat absensi 10 hari terakhir
    for (let d = 1; d <= 10; d++) {
      const rand = Math.random();
      const status = rand > 0.85 ? 'ALPHA' : rand > 0.7 ? 'SICK' : 'PRESENT';
      await prisma.attendance.create({
        data: {
          studentId,
          status,
          date: new Date(Date.now() - d * 86400000),
          notified: true,
        },
      });
    }
  }

  // 2 pendaftar contoh berstatus PENDING (untuk uji fitur persetujuan admin)
  for (let i = 0; i < PENDING_NAMES.length; i++) {
    const name = PENDING_NAMES[i];
    const email = `pendaftar${i + 1}@almunasamboja.id`;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) continue;

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'STUDENT',
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
        student: {
          create: {
            courseId: randomFrom(createdCourses).id,
            address: `Jl. Pendaftar No. ${i + 1}, Samboja`,
            parentPhone: randomPhone(),
            status: 'PENDING',
          },
        },
      },
    });
  }

  console.log('✅ Seeding selesai!');
  console.log('---');
  console.log('Akun contoh (password semua: password123):');
  console.log('  Admin      : admin@almunasamboja.id');
  console.log('  Guru       : guru@almunasamboja.id');
  console.log('  Siswa      : siswa1@almunasamboja.id s/d siswa10@almunasamboja.id (APPROVED)');
  console.log('  Pendaftar  : pendaftar1@almunasamboja.id, pendaftar2@almunasamboja.id (PENDING - coba fitur approval admin)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
