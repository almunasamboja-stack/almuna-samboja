// Controller kursus - detail kursus publik + kelola kursus oleh admin (per kategori/tab)
const prisma = require('../lib/prisma');

// GET /api/courses -> daftar semua kursus (publik, tidak perlu login)
async function getCourses(req, res) {
  try {
    const courses = await prisma.course.findMany({ orderBy: [{ category: 'asc' }, { id: 'asc' }] });
    res.json({ courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data kursus' });
  }
}

// POST /api/courses -> tambah kursus baru (khusus admin)
// body: { name, description, category, fee, schedule, quota, registrationDeadline }
async function createCourse(req, res) {
  try {
    const { name, description, category, fee, schedule, quota, registrationDeadline } = req.body;

    if (!name || fee === undefined || !schedule) {
      return res.status(400).json({ message: 'Nama, biaya, dan jadwal kursus wajib diisi' });
    }

    const course = await prisma.course.create({
      data: {
        name,
        description: description || '',
        category: category || 'Umum',
        fee: Number(fee),
        schedule,
        quota: quota !== undefined && quota !== '' ? Number(quota) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      },
    });

    res.status(201).json({ message: 'Kursus berhasil ditambahkan', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambahkan kursus' });
  }
}

// PUT /api/courses/:id -> edit kursus (khusus admin)
async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    const { name, description, category, fee, schedule, quota, registrationDeadline } = req.body;

    const existing = await prisma.course.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Kursus tidak ditemukan' });
    }

    const course = await prisma.course.update({
      where: { id: Number(id) },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        category: category ?? existing.category,
        fee: fee !== undefined ? Number(fee) : existing.fee,
        schedule: schedule ?? existing.schedule,
        quota: quota !== undefined ? (quota === '' ? null : Number(quota)) : existing.quota,
        registrationDeadline:
          registrationDeadline !== undefined
            ? registrationDeadline
              ? new Date(registrationDeadline)
              : null
            : existing.registrationDeadline,
      },
    });

    res.json({ message: 'Kursus berhasil diperbarui', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui kursus' });
  }
}

// DELETE /api/courses/:id -> hapus kursus (khusus admin)
// Siswa yang terdaftar di kursus ini tidak ikut terhapus - courseId mereka jadi null (lihat schema.prisma)
async function deleteCourse(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.course.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Kursus tidak ditemukan' });
    }

    await prisma.course.delete({ where: { id: Number(id) } });
    res.json({ message: 'Kursus berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus kursus' });
  }
}

module.exports = { getCourses, createCourse, updateCourse, deleteCourse };
