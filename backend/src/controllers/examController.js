// Controller ujian online - kelola ujian & kunci jawaban (admin/guru), lihat & kerjakan (siswa)
const prisma = require('../lib/prisma');
const { listFilesInFolder } = require('../lib/googleDrive');

const EXAM_INCLUDE_ADMIN = {
  course: { select: { id: true, name: true } },
  answerKeys: { orderBy: { questionNumber: 'asc' } },
  _count: { select: { attempts: true } },
};

// GET /api/exams/drive-files -> daftar file di folder Google Drive soal (admin/guru)
async function getDriveFiles(req, res) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return res.status(500).json({ message: 'GOOGLE_DRIVE_FOLDER_ID belum diatur di server' });
    }
    const files = await listFilesInFolder(folderId);
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Gagal mengambil daftar file dari Google Drive' });
  }
}

// GET /api/exams -> daftar semua ujian (admin/guru)
async function getAllExams(req, res) {
  try {
    const exams = await prisma.exam.findMany({
      include: EXAM_INCLUDE_ADMIN,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ exams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil daftar ujian' });
  }
}

// POST /api/exams -> buat ujian baru (admin/guru)
// body: { title, description, driveFileId, driveFileName, courseId, totalQuestions, durationMinutes, answerKeys: [{questionNumber, correctAnswer}] }
async function createExam(req, res) {
  try {
    const { title, description, driveFileId, driveFileName, courseId, totalQuestions, durationMinutes, answerKeys } = req.body;

    if (!title || !driveFileId || !totalQuestions) {
      return res.status(400).json({ message: 'Judul, file soal, dan jumlah soal wajib diisi' });
    }
    if (!Array.isArray(answerKeys) || answerKeys.length !== Number(totalQuestions)) {
      return res.status(400).json({ message: 'Kunci jawaban harus diisi untuk semua nomor soal' });
    }
    const invalid = answerKeys.some((a) => !['A', 'B', 'C', 'D'].includes(a.correctAnswer));
    if (invalid) {
      return res.status(400).json({ message: 'Kunci jawaban harus A, B, C, atau D' });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || null,
        driveFileId,
        driveFileName: driveFileName || null,
        courseId: courseId ? Number(courseId) : null,
        totalQuestions: Number(totalQuestions),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        answerKeys: {
          create: answerKeys.map((a) => ({
            questionNumber: Number(a.questionNumber),
            correctAnswer: a.correctAnswer,
          })),
        },
      },
      include: EXAM_INCLUDE_ADMIN,
    });

    res.status(201).json({ message: 'Ujian berhasil dibuat', exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal membuat ujian' });
  }
}

// PUT /api/exams/:id -> edit ujian & kunci jawaban (admin/guru)
async function updateExam(req, res) {
  try {
    const { id } = req.params;
    const { title, description, driveFileId, driveFileName, courseId, totalQuestions, durationMinutes, answerKeys } = req.body;

    const existing = await prisma.exam.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Ujian tidak ditemukan' });
    }

    if (answerKeys !== undefined) {
      const invalid = answerKeys.some((a) => !['A', 'B', 'C', 'D'].includes(a.correctAnswer));
      if (invalid) {
        return res.status(400).json({ message: 'Kunci jawaban harus A, B, C, atau D' });
      }
      await prisma.examAnswerKey.deleteMany({ where: { examId: Number(id) } });
      await prisma.examAnswerKey.createMany({
        data: answerKeys.map((a) => ({
          examId: Number(id),
          questionNumber: Number(a.questionNumber),
          correctAnswer: a.correctAnswer,
        })),
      });
    }

    const exam = await prisma.exam.update({
      where: { id: Number(id) },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        driveFileId: driveFileId ?? existing.driveFileId,
        driveFileName: driveFileName !== undefined ? driveFileName : existing.driveFileName,
        courseId: courseId !== undefined ? (courseId ? Number(courseId) : null) : existing.courseId,
        totalQuestions: totalQuestions !== undefined ? Number(totalQuestions) : existing.totalQuestions,
        durationMinutes: durationMinutes !== undefined ? (durationMinutes ? Number(durationMinutes) : null) : existing.durationMinutes,
      },
      include: EXAM_INCLUDE_ADMIN,
    });

    res.json({ message: 'Ujian berhasil diperbarui', exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui ujian' });
  }
}

// PATCH /api/exams/:id/publish -> publish/unpublish ujian (admin/guru)
async function togglePublish(req, res) {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const exam = await prisma.exam.update({
      where: { id: Number(id) },
      data: { isPublished: !!isPublished },
      include: EXAM_INCLUDE_ADMIN,
    });

    res.json({ message: isPublished ? 'Ujian dipublikasikan' : 'Ujian disembunyikan', exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengubah status ujian' });
  }
}

// DELETE /api/exams/:id -> hapus ujian (admin/guru)
async function deleteExam(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.exam.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Ujian tidak ditemukan' });
    }
    await prisma.exam.delete({ where: { id: Number(id) } });
    res.json({ message: 'Ujian berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus ujian' });
  }
}

// GET /api/exams/:id/attempts -> daftar hasil pengerjaan semua siswa untuk 1 ujian (admin/guru)
async function getExamAttempts(req, res) {
  try {
    const { id } = req.params;
    const attempts = await prisma.examAttempt.findMany({
      where: { examId: Number(id) },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ attempts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil hasil ujian' });
  }
}

// GET /api/exams/results-recap?courseId=X -> rekap nilai ujian per anak, difilter per pelajaran/kelas (admin/guru)
async function getExamResultsRecap(req, res) {
  try {
    const { courseId } = req.query;

    const attempts = await prisma.examAttempt.findMany({
      where: {
        ...(courseId ? { exam: { courseId: Number(courseId) } } : {}),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        exam: { include: { course: { select: { id: true, name: true, category: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const result = attempts.map((a) => ({
      attemptId: a.id,
      studentId: a.studentId,
      studentName: a.student.user.name,
      examTitle: a.exam.title,
      courseName: a.exam.course?.name || 'Semua Kelas',
      courseCategory: a.exam.course?.category || '-',
      score: a.score,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      submittedAt: a.submittedAt,
    }));

    res.json({ attempts: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil rekap nilai ujian' });
  }
}

// GET /api/exams/summary?courseId=X -> ringkasan rata-rata nilai PER UJIAN yang diadakan (admin/guru)
async function getExamSummary(req, res) {
  try {
    const { courseId } = req.query;

    const exams = await prisma.exam.findMany({
      where: {
        ...(courseId ? { courseId: Number(courseId) } : {}),
      },
      include: {
        course: { select: { name: true } },
        attempts: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = exams.map((e) => {
      const scores = e.attempts.map((a) => a.score);
      const average = scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : null;
      const highest = scores.length > 0 ? Math.max(...scores) : null;
      const lowest = scores.length > 0 ? Math.min(...scores) : null;

      return {
        examId: e.id,
        title: e.title,
        courseName: e.course?.name || 'Semua Kelas',
        totalAttempts: scores.length,
        average,
        highest,
        lowest,
      };
    });

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil ringkasan ujian' });
  }
}

// POST /api/exams/attempts -> catat nilai ujian secara manual (admin/guru), misal untuk ujian offline
// body: { studentId, examId, score, correctCount, totalQuestions, submittedAt }
async function createAttempt(req, res) {
  try {
    const { studentId, examId, score, correctCount, totalQuestions, submittedAt } = req.body;

    if (!studentId || !examId || score === undefined || correctCount === undefined || totalQuestions === undefined) {
      return res.status(400).json({ message: 'Data nilai tidak lengkap' });
    }
    if (Number(score) < 0 || Number(score) > 100) {
      return res.status(400).json({ message: 'Nilai harus di antara 0 - 100' });
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        studentId: Number(studentId),
        examId: Number(examId),
        score: Number(score),
        correctCount: Number(correctCount),
        totalQuestions: Number(totalQuestions),
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        exam: { include: { course: { select: { id: true, name: true, category: true } } } },
      },
    });

    res.status(201).json({ message: 'Nilai ujian berhasil dicatat', attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mencatat nilai ujian' });
  }
}

// PUT /api/exams/attempts/:attemptId -> edit nilai ujian (admin/guru)
async function updateAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const { score, correctCount, totalQuestions, submittedAt } = req.body;

    const existing = await prisma.examAttempt.findUnique({ where: { id: Number(attemptId) } });
    if (!existing) {
      return res.status(404).json({ message: 'Nilai ujian tidak ditemukan' });
    }
    if (score !== undefined && (Number(score) < 0 || Number(score) > 100)) {
      return res.status(400).json({ message: 'Nilai harus di antara 0 - 100' });
    }

    const attempt = await prisma.examAttempt.update({
      where: { id: Number(attemptId) },
      data: {
        score: score !== undefined ? Number(score) : existing.score,
        correctCount: correctCount !== undefined ? Number(correctCount) : existing.correctCount,
        totalQuestions: totalQuestions !== undefined ? Number(totalQuestions) : existing.totalQuestions,
        submittedAt: submittedAt ? new Date(submittedAt) : existing.submittedAt,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        exam: { include: { course: { select: { id: true, name: true, category: true } } } },
      },
    });

    res.json({ message: 'Nilai ujian berhasil diperbarui', attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui nilai ujian' });
  }
}

// DELETE /api/exams/attempts/:attemptId -> hapus nilai ujian (admin/guru)
async function deleteAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const existing = await prisma.examAttempt.findUnique({ where: { id: Number(attemptId) } });
    if (!existing) {
      return res.status(404).json({ message: 'Nilai ujian tidak ditemukan' });
    }
    await prisma.examAttempt.delete({ where: { id: Number(attemptId) } });
    res.json({ message: 'Nilai ujian berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus nilai ujian' });
  }
}

module.exports = {
  getDriveFiles,
  getAllExams,
  createExam,
  updateExam,
  togglePublish,
  deleteExam,
  getExamAttempts,
  getExamResultsRecap,
  getExamSummary,
  createAttempt,
  updateAttempt,
  deleteAttempt,
};
