// Controller Assessment Report (Speaking, Listening, Vocabulary, Reading, Grammar) per bulan
const prisma = require('../lib/prisma');

const CATEGORIES = ['speaking', 'listening', 'vocabulary', 'reading', 'grammar'];

const ASSESSMENT_INCLUDE = {
  student: { include: { user: { select: { name: true } } } },
  course: { select: { id: true, name: true } },
};

function average(assessment) {
  const values = CATEGORIES.map((c) => assessment[c]).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

// GET /api/assessments?month=X&year=Y&courseId=Z -> daftar siswa + nilai assessment bulan itu (admin/guru)
async function getClassAssessments(req, res) {
  try {
    const { month, year, courseId } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Bulan dan tahun wajib diisi' });
    }

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        ...(courseId ? { enrollments: { some: { courseId: Number(courseId) } } } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
        assessments: {
          where: { periodMonth: Number(month), periodYear: Number(year) },
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => {
      const existing = s.assessments[0] || null;
      return {
        studentId: s.id,
        name: s.user.name,
        avatarUrl: s.user.avatarUrl,
        class: s.enrollments.length > 0 ? s.enrollments.map((e) => e.course.name).join(', ') : 'Belum ada kelas',
        assessmentId: existing?.id || null,
        speaking: existing?.speaking ?? null,
        listening: existing?.listening ?? null,
        vocabulary: existing?.vocabulary ?? null,
        reading: existing?.reading ?? null,
        grammar: existing?.grammar ?? null,
        average: existing ? average(existing) : null,
        notes: existing?.notes || '',
      };
    });

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data assessment' });
  }
}

// PUT /api/assessments/:studentId -> simpan/ubah nilai assessment 1 siswa untuk 1 bulan (admin/guru)
// body: { courseId, periodMonth, periodYear, speaking, listening, vocabulary, reading, grammar, notes }
async function upsertAssessment(req, res) {
  try {
    const { studentId } = req.params;
    const { courseId, periodMonth, periodYear, speaking, listening, vocabulary, reading, grammar, notes } = req.body;

    if (!periodMonth || !periodYear) {
      return res.status(400).json({ message: 'Bulan dan tahun wajib diisi' });
    }

    const scoreFields = { speaking, listening, vocabulary, reading, grammar };
    for (const [key, val] of Object.entries(scoreFields)) {
      if (val !== undefined && val !== null && val !== '' && (Number(val) < 0 || Number(val) > 100)) {
        return res.status(400).json({ message: `Nilai ${key} harus di antara 0 - 100` });
      }
    }

    const toNumOrNull = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

    const assessment = await prisma.assessment.upsert({
      where: {
        studentId_periodMonth_periodYear: {
          studentId: Number(studentId),
          periodMonth: Number(periodMonth),
          periodYear: Number(periodYear),
        },
      },
      create: {
        studentId: Number(studentId),
        courseId: courseId ? Number(courseId) : null,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        speaking: toNumOrNull(speaking),
        listening: toNumOrNull(listening),
        vocabulary: toNumOrNull(vocabulary),
        reading: toNumOrNull(reading),
        grammar: toNumOrNull(grammar),
        notes: notes || null,
      },
      update: {
        courseId: courseId !== undefined ? (courseId ? Number(courseId) : null) : undefined,
        speaking: toNumOrNull(speaking),
        listening: toNumOrNull(listening),
        vocabulary: toNumOrNull(vocabulary),
        reading: toNumOrNull(reading),
        grammar: toNumOrNull(grammar),
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: ASSESSMENT_INCLUDE,
    });

    res.json({ message: 'Assessment berhasil disimpan', assessment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menyimpan assessment' });
  }
}

// GET /api/assessments/student/:studentId -> riwayat assessment bulanan 1 siswa (siswa sendiri atau admin/guru)
async function getStudentAssessments(req, res) {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'STUDENT') {
      const ownStudent = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!ownStudent || ownStudent.id !== Number(studentId)) {
        return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini' });
      }
    }

    const assessments = await prisma.assessment.findMany({
      where: { studentId: Number(studentId) },
      include: ASSESSMENT_INCLUDE,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    const result = assessments.map((a) => ({
      id: a.id,
      periodMonth: a.periodMonth,
      periodYear: a.periodYear,
      courseName: a.course?.name || null,
      speaking: a.speaking,
      listening: a.listening,
      vocabulary: a.vocabulary,
      reading: a.reading,
      grammar: a.grammar,
      average: average(a),
      notes: a.notes,
    }));

    res.json({ assessments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil riwayat assessment' });
  }
}

module.exports = { getClassAssessments, upsertAssessment, getStudentAssessments };
