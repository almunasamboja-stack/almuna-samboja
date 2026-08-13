// Controller rekap per kelas (nilai & kehadiran) - khusus admin
const prisma = require('../lib/prisma');

// GET /api/reports/class-recap?courseId=X -> rekap kehadiran & nilai per siswa
// Jika courseId tidak diberikan, rekap seluruh siswa yang disetujui (semua kelas).
async function getClassRecap(req, res) {
  try {
    const { courseId } = req.query;

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        ...(courseId ? { courseId: Number(courseId) } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { id: true, name: true, category: true } },
        attendances: { select: { status: true } },
        grades: { select: { type: true, score: true } },
      },
      orderBy: { id: 'asc' },
    });

    const recap = students.map((s) => {
      const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const sick = s.attendances.filter((a) => a.status === 'SICK').length;
      const alpha = s.attendances.filter((a) => a.status === 'ALPHA').length;
      const totalAttendance = s.attendances.length;
      const attendancePercentage = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

      const dailyGrades = s.grades.filter((g) => g.type === 'DAILY');
      const monthlyGrades = s.grades.filter((g) => g.type === 'MONTHLY');
      const dailyAverage =
        dailyGrades.length > 0
          ? Math.round((dailyGrades.reduce((sum, g) => sum + g.score, 0) / dailyGrades.length) * 10) / 10
          : null;
      const monthlyAverage =
        monthlyGrades.length > 0
          ? Math.round((monthlyGrades.reduce((sum, g) => sum + g.score, 0) / monthlyGrades.length) * 10) / 10
          : null;

      return {
        studentId: s.id,
        name: s.user.name,
        email: s.user.email,
        courseId: s.course?.id || null,
        className: s.course?.name || 'Belum ada kelas',
        category: s.course?.category || '-',
        present,
        sick,
        alpha,
        totalAttendance,
        attendancePercentage,
        dailyAverage,
        monthlyAverage,
      };
    });

    let courseInfo = null;
    if (courseId) {
      courseInfo = await prisma.course.findUnique({ where: { id: Number(courseId) } });
    }

    res.json({ course: courseInfo, students: recap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil rekap kelas' });
  }
}

module.exports = { getClassRecap };
