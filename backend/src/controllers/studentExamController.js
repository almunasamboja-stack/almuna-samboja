// Controller ujian untuk siswa - lihat daftar ujian tersedia, kerjakan, dapat hasil otomatis
const prisma = require('../lib/prisma');

async function getOwnStudentId(userId) {
  const student = await prisma.student.findUnique({ where: { userId } });
  return student ? student.id : null;
}

// GET /api/student-exams -> daftar ujian yang tersedia untuk siswa yang login
// (hanya ujian published, di kelas yang diikuti siswa tsb atau tidak terikat kelas manapun)
async function getAvailableExams(req, res) {
  try {
    const studentId = await getOwnStudentId(req.user.id);
    if (!studentId) return res.status(404).json({ message: 'Profil siswa tidak ditemukan' });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { enrollments: true },
    });
    const enrolledCourseIds = student.enrollments.map((e) => e.courseId);

    const exams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        OR: [{ courseId: null }, { courseId: { in: enrolledCourseIds } }],
      },
      include: {
        course: { select: { name: true } },
        attempts: { where: { studentId }, orderBy: { submittedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      courseName: e.course?.name || null,
      totalQuestions: e.totalQuestions,
      durationMinutes: e.durationMinutes,
      lastAttempt: e.attempts[0]
        ? { score: e.attempts[0].score, submittedAt: e.attempts[0].submittedAt }
        : null,
    }));

    res.json({ exams: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil daftar ujian' });
  }
}

// GET /api/student-exams/:id -> detail 1 ujian untuk dikerjakan (TANPA kunci jawaban)
async function getExamToTake(req, res) {
  try {
    const { id } = req.params;
    const studentId = await getOwnStudentId(req.user.id);
    if (!studentId) return res.status(404).json({ message: 'Profil siswa tidak ditemukan' });

    const exam = await prisma.exam.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        title: true,
        description: true,
        driveFileId: true,
        driveFileName: true,
        totalQuestions: true,
        durationMinutes: true,
        isPublished: true,
        course: { select: { name: true } },
      },
    });

    if (!exam || !exam.isPublished) {
      return res.status(404).json({ message: 'Ujian tidak ditemukan' });
    }

    res.json({ exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil detail ujian' });
  }
}

// POST /api/student-exams/:id/submit -> submit jawaban, dinilai otomatis
// body: { answers: [{ questionNumber, selectedAnswer }] }
async function submitExam(req, res) {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const studentId = await getOwnStudentId(req.user.id);
    if (!studentId) return res.status(404).json({ message: 'Profil siswa tidak ditemukan' });

    const exam = await prisma.exam.findUnique({
      where: { id: Number(id) },
      include: { answerKeys: true },
    });
    if (!exam || !exam.isPublished) {
      return res.status(404).json({ message: 'Ujian tidak ditemukan' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Jawaban wajib diisi' });
    }

    const keyMap = {};
    exam.answerKeys.forEach((k) => {
      keyMap[k.questionNumber] = k.correctAnswer;
    });

    let correctCount = 0;
    const gradedAnswers = answers.map((a) => {
      const isCorrect = keyMap[a.questionNumber] === a.selectedAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionNumber: Number(a.questionNumber),
        selectedAnswer: a.selectedAnswer,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / exam.totalQuestions) * 1000) / 10; // 1 desimal

    const attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId,
        score,
        correctCount,
        totalQuestions: exam.totalQuestions,
        answers: { create: gradedAnswers },
      },
      include: { answers: { orderBy: { questionNumber: 'asc' } } },
    });

    res.status(201).json({ message: 'Ujian berhasil disubmit', attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal submit ujian' });
  }
}

// GET /api/student-exams/attempts/me -> riwayat semua hasil ujian siswa yang login
async function getMyAttempts(req, res) {
  try {
    const studentId = await getOwnStudentId(req.user.id);
    if (!studentId) return res.status(404).json({ message: 'Profil siswa tidak ditemukan' });

    const attempts = await prisma.examAttempt.findMany({
      where: { studentId },
      include: { exam: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ attempts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil riwayat ujian' });
  }
}

// GET /api/student-exams/attempts/:attemptId -> detail hasil 1 pengerjaan (benar/salah per nomor)
async function getAttemptDetail(req, res) {
  try {
    const { attemptId } = req.params;
    const studentId = await getOwnStudentId(req.user.id);

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: Number(attemptId) },
      include: {
        exam: { include: { answerKeys: { orderBy: { questionNumber: 'asc' } } } },
        answers: { orderBy: { questionNumber: 'asc' } },
      },
    });

    if (!attempt) return res.status(404).json({ message: 'Hasil ujian tidak ditemukan' });

    // Siswa hanya boleh lihat hasil miliknya sendiri; admin/guru boleh lihat semua
    if (req.user.role === 'STUDENT' && attempt.studentId !== studentId) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini' });
    }

    res.json({ attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil detail hasil ujian' });
  }
}

module.exports = {
  getAvailableExams,
  getExamToTake,
  submitExam,
  getMyAttempts,
  getAttemptDetail,
};
