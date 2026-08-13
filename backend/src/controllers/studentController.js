// Controller profil & manajemen data siswa (termasuk persetujuan pendaftaran)
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

const STUDENT_SELECT_INCLUDE = {
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
  course: { select: { id: true, name: true, category: true } },
};

// GET /api/students/me -> profil siswa yang sedang login
async function getMyProfile(req, res) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: STUDENT_SELECT_INCLUDE,
    });

    if (!student) {
      return res.status(404).json({ message: 'Profil siswa tidak ditemukan' });
    }

    res.json({ student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil profil siswa' });
  }
}

// PUT /api/students/me -> siswa mengedit biodata sendiri (nama, alamat, no. HP ortu)
async function updateMyProfile(req, res) {
  try {
    const { name, address, parentPhone } = req.body;

    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Profil siswa tidak ditemukan' });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        address: address ?? student.address,
        parentPhone: parentPhone ?? student.parentPhone,
      },
    });

    if (name) {
      await prisma.user.update({ where: { id: req.user.id }, data: { name } });
    }

    const updated = await prisma.student.findUnique({
      where: { id: student.id },
      include: STUDENT_SELECT_INCLUDE,
    });

    res.json({ message: 'Biodata berhasil diperbarui', student: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui biodata' });
  }
}

// GET /api/students -> daftar semua siswa (khusus admin), termasuk yang masih PENDING
async function getAllStudents(req, res) {
  try {
    const students = await prisma.student.findMany({
      include: STUDENT_SELECT_INCLUDE,
      orderBy: { id: 'asc' },
    });
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil daftar siswa' });
  }
}

// POST /api/students -> tambah siswa baru langsung oleh admin (khusus admin)
// Siswa yang ditambahkan admin otomatis berstatus APPROVED.
// body: { name, email, password, courseId, address, parentPhone }
async function createStudent(req, res) {
  try {
    const { name, email, password, courseId, address, parentPhone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarUrl = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : `https://i.pravatar.cc/150?u=${email}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'STUDENT',
        avatarUrl,
        student: {
          create: {
            courseId: courseId ? Number(courseId) : undefined,
            address: address || '-',
            parentPhone: parentPhone || '-',
            status: 'APPROVED',
          },
        },
      },
      include: { student: { include: STUDENT_SELECT_INCLUDE } },
    });

    res.status(201).json({ message: 'Siswa berhasil ditambahkan', student: user.student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambahkan siswa' });
  }
}

// PUT /api/students/:id -> edit data siswa mana pun (khusus admin)
// body: { name, courseId, address, parentPhone }
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const { name, courseId, address, parentPhone } = req.body;

    const student = await prisma.student.findUnique({ where: { id: Number(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    await prisma.student.update({
      where: { id: Number(id) },
      data: {
        courseId: courseId !== undefined ? (courseId ? Number(courseId) : null) : undefined,
        address: address ?? student.address,
        parentPhone: parentPhone ?? student.parentPhone,
      },
    });

    if (name) {
      await prisma.user.update({ where: { id: student.userId }, data: { name } });
    }

    const updated = await prisma.student.findUnique({
      where: { id: Number(id) },
      include: STUDENT_SELECT_INCLUDE,
    });

    res.json({ message: 'Data siswa berhasil diperbarui', student: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui data siswa' });
  }
}

// PATCH /api/students/:id/status -> setujui / tolak pendaftar (khusus admin)
// body: { status: 'APPROVED' | 'REJECTED' | 'PENDING' }
async function updateStudentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const student = await prisma.student.findUnique({ where: { id: Number(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    const updated = await prisma.student.update({
      where: { id: Number(id) },
      data: { status },
      include: STUDENT_SELECT_INCLUDE,
    });

    res.json({ message: 'Status pendaftar berhasil diperbarui', student: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui status pendaftar' });
  }
}

// DELETE /api/students/:id -> hapus siswa (khusus admin)
// Menghapus User terkait akan otomatis menghapus Student, Attendance, dan Grade (cascade)
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id: Number(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }

    await prisma.user.delete({ where: { id: student.userId } });

    res.json({ message: 'Siswa berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus siswa' });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getAllStudents,
  createStudent,
  updateStudent,
  updateStudentStatus,
  deleteStudent,
};
