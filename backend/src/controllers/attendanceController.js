// Controller absensi - inti bisnis aplikasi
const prisma = require('../lib/prisma');
const { sendAttendanceNotification } = require('../services/whatsappService');

// GET /api/attendance/today?courseId=X -> daftar siswa + status absensi hari ini untuk 1 kelas (untuk grid guru)
// courseId WAJIB diisi: absensi sekarang selalu per mata pelajaran, bukan digabung semua kelas,
// supaya siswa yang ikut >1 kelas punya status kehadiran terpisah untuk tiap pelajaran di hari yang sama.
async function getTodayAttendance(req, res) {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ message: 'Pilih kelas/mata pelajaran terlebih dahulu' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED', // hanya siswa yang sudah disetujui admin yang tampil di absensi
        enrollments: { some: { courseId: Number(courseId) } },
      },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
        attendances: {
          where: { date: { gte: startOfDay, lte: endOfDay }, courseId: Number(courseId) },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      class: s.enrollments.find((e) => e.course.id === Number(courseId))?.course.name || 'Belum ada kelas',
      courseIds: s.enrollments.map((e) => e.course.id),
      avatarUrl: s.user.avatarUrl,
      parentPhone: s.parentPhone,
      status: s.attendances[0]?.status || null, // null = belum diabsen untuk kelas ini hari ini
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data absensi hari ini' });
  }
}

// POST /api/attendance -> catat absensi 1 siswa untuk 1 kelas/mata pelajaran + (opsional) kirim notif WA
// body: { studentId, courseId, status: 'PRESENT'|'SICK'|'IZIN'|'ALPHA', notify: boolean }
// Kalau siswa itu di kelas & tanggal yang sama sudah pernah diabsen, statusnya DIPERBARUI (bukan dobel record),
// supaya rekap per hari per kelas tetap 1 baris per siswa.
async function recordAttendance(req, res) {
  try {
    const { studentId, courseId, status, notify } = req.body;

    if (!studentId || !courseId || !['PRESENT', 'SICK', 'IZIN', 'ALPHA'].includes(status)) {
      return res.status(400).json({ message: 'studentId, courseId, dan status yang valid wajib diisi' });
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: { user: true, enrollments: true },
    });

    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    const isEnrolled = student.enrollments.some((e) => e.courseId === Number(courseId));
    if (!isEnrolled) {
      return res.status(400).json({ message: 'Siswa ini tidak terdaftar di kelas/mata pelajaran tersebut' });
    }

    let notifResult = { success: false };
    if (notify) {
      // Kirim notifikasi WA (simulasi console.log, lihat services/whatsappService.js)
      notifResult = await sendAttendanceNotification(student.parentPhone, student.user.name, status);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, courseId: Number(courseId), date: { gte: startOfDay, lte: endOfDay } },
    });

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { status, notified: !!notifResult.success },
        })
      : await prisma.attendance.create({
          data: {
            studentId: student.id,
            courseId: Number(courseId),
            status,
            notified: !!notifResult.success,
          },
        });

    res.status(201).json({
      message: 'Absensi berhasil dicatat',
      attendance,
      notified: !!notifResult.success,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mencatat absensi' });
  }
}

// GET /api/attendance/student/:studentId?courseId=X -> riwayat + rekap persentase (untuk dashboard siswa)
// courseId opsional: kalau diisi, rekap hanya untuk mata pelajaran itu (dipakai kalau siswa ikut >1 kelas).
// Kalau tidak diisi, rekap digabung dari semua kelas yang diikuti (dan data lama tanpa courseId).
async function getStudentAttendance(req, res) {
  try {
    const { studentId } = req.params;
    const { courseId } = req.query;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const baseWhere = { studentId: Number(studentId), ...(courseId ? { courseId: Number(courseId) } : {}) };

    const history = await prisma.attendance.findMany({
      where: baseWhere,
      include: { course: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const monthRecords = await prisma.attendance.findMany({
      where: { ...baseWhere, date: { gte: startOfMonth, lte: endOfMonth } },
    });

    const totalHari = monthRecords.length;
    const hadir = monthRecords.filter((r) => r.status === 'PRESENT').length;
    const percentage = totalHari > 0 ? Math.round((hadir / totalHari) * 100) : 0;

    res.json({ history, percentage, totalHari, hadir });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil riwayat absensi' });
  }
}

// GET /api/attendance/recap?month=M&year=Y&courseId=X -> rekap absensi 1 bulan penuh per siswa, untuk 1 kelas/mata pelajaran
// (mode "per bulan" pada halaman "Rekap Absensi Per Tanggal"). courseId WAJIB diisi (absensi per pelajaran, bukan gabungan).
async function getAttendanceByMonth(req, res) {
  try {
    const { month, year, courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ message: 'Pilih kelas/mata pelajaran terlebih dahulu' });
    }
    const m = Number(month);
    const y = Number(year);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        enrollments: { some: { courseId: Number(courseId) } },
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
        attendances: {
          where: { date: { gte: start, lt: end }, courseId: Number(courseId) },
          select: { status: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => {
      const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const sick = s.attendances.filter((a) => a.status === 'SICK').length;
      const izin = s.attendances.filter((a) => a.status === 'IZIN').length;
      const alpha = s.attendances.filter((a) => a.status === 'ALPHA').length;
      const total = s.attendances.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        studentId: s.id,
        name: s.user.name,
        avatarUrl: s.user.avatarUrl,
        class: s.enrollments.find((e) => e.course.id === Number(courseId))?.course.name || 'Belum ada kelas',
        present,
        sick,
        izin,
        alpha,
        total,
        percentage,
      };
    });

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil rekap absensi bulanan' });
  }
}

// GET /api/attendance/recap?date=YYYY-MM-DD&courseId=X -> rekap absensi untuk 1 tanggal tertentu, untuk 1 kelas/mata pelajaran
// (untuk halaman "Rekap Absensi Per Tanggal" guru/admin). courseId WAJIB diisi (absensi per pelajaran, bukan gabungan).
async function getAttendanceByDate(req, res) {
  try {
    const { date, courseId } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Tanggal wajib diisi' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'Pilih kelas/mata pelajaran terlebih dahulu' });
    }

    const target = new Date(date);
    if (Number.isNaN(target.getTime())) {
      return res.status(400).json({ message: 'Format tanggal tidak valid' });
    }
    const startOfDay = new Date(target);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        enrollments: { some: { courseId: Number(courseId) } },
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
        attendances: {
          where: { date: { gte: startOfDay, lte: endOfDay }, courseId: Number(courseId) },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      class: s.enrollments.find((e) => e.course.id === Number(courseId))?.course.name || 'Belum ada kelas',
      status: s.attendances[0]?.status || null, // null = belum/tidak diabsen pada tanggal ini untuk kelas ini
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil rekap absensi' });
  }
}

module.exports = {
  getTodayAttendance,
  recordAttendance,
  getStudentAttendance,
  getAttendanceByDate,
  getAttendanceByMonth,
};
