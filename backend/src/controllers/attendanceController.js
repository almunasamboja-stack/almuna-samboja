// Controller absensi - inti bisnis aplikasi
const prisma = require('../lib/prisma');
const { sendAttendanceNotification } = require('../services/whatsappService');

// GET /api/attendance/today?courseId=X -> daftar siswa + status absensi hari ini (untuk grid guru)
// Jika courseId diberikan, hanya siswa di kelas tersebut yang dikembalikan.
async function getTodayAttendance(req, res) {
  try {
    const { courseId } = req.query;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED', // hanya siswa yang sudah disetujui admin yang tampil di absensi
        ...(courseId ? { enrollments: { some: { courseId: Number(courseId) } } } : {}),
      },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
        attendances: {
          where: { date: { gte: startOfDay, lte: endOfDay } },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      class: s.enrollments.length > 0 ? s.enrollments.map((e) => e.course.name).join(', ') : 'Belum ada kelas',
      courseIds: s.enrollments.map((e) => e.course.id),
      avatarUrl: s.user.avatarUrl,
      parentPhone: s.parentPhone,
      status: s.attendances[0]?.status || null, // null = belum diabsen
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data absensi hari ini' });
  }
}

// POST /api/attendance -> catat absensi 1 siswa + (opsional) kirim notif WA
// body: { studentId, status: 'PRESENT'|'SICK'|'IZIN'|'ALPHA', notify: boolean }
async function recordAttendance(req, res) {
  try {
    const { studentId, status, notify } = req.body;

    if (!studentId || !['PRESENT', 'SICK', 'IZIN', 'ALPHA'].includes(status)) {
      return res.status(400).json({ message: 'studentId dan status yang valid wajib diisi' });
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    let notifResult = { success: false };
    if (notify) {
      // Kirim notifikasi WA (simulasi console.log, lihat services/whatsappService.js)
      notifResult = await sendAttendanceNotification(student.parentPhone, student.user.name, status);
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
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

// GET /api/attendance/student/:studentId -> riwayat + rekap persentase (untuk dashboard siswa)
async function getStudentAttendance(req, res) {
  try {
    const { studentId } = req.params;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const history = await prisma.attendance.findMany({
      where: { studentId: Number(studentId) },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const monthRecords = await prisma.attendance.findMany({
      where: { studentId: Number(studentId), date: { gte: startOfMonth, lte: endOfMonth } },
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

// GET /api/attendance/recap?date=YYYY-MM-DD&courseId=X -> rekap absensi untuk 1 tanggal tertentu
// (untuk halaman "Rekap Absensi Per Tanggal" guru/admin). courseId opsional.
async function getAttendanceByDate(req, res) {
  try {
    const { date, courseId } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Tanggal wajib diisi' });
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
        ...(courseId ? { enrollments: { some: { courseId: Number(courseId) } } } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { name: true } } } },
        attendances: {
          where: { date: { gte: startOfDay, lte: endOfDay } },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      class: s.enrollments.length > 0 ? s.enrollments.map((e) => e.course.name).join(', ') : 'Belum ada kelas',
      status: s.attendances[0]?.status || null, // null = belum/tidak diabsen pada tanggal ini
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil rekap absensi' });
  }
}

module.exports = { getTodayAttendance, recordAttendance, getStudentAttendance, getAttendanceByDate };
