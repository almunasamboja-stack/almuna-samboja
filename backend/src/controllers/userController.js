// Controller manajemen foto profil untuk SEMUA role (admin, guru, siswa)
const prisma = require('../lib/prisma');
const { deleteUploadedFile } = require('../middleware/upload');

function defaultAvatar(email) {
  return `https://i.pravatar.cc/150?u=${email}`;
}

// GET /api/users -> daftar seluruh akun (khusus admin), untuk kelola foto guru/admin/siswa
async function getAllUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      orderBy: { id: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil daftar akun' });
  }
}

// POST /api/users/me/avatar -> upload/ganti foto profil sendiri (semua role)
async function uploadMyAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File foto wajib diunggah' });
    }

    const current = await prisma.user.findUnique({ where: { id: req.user.id } });
    const newUrl = `/uploads/avatars/${req.file.filename}`;

    if (current.avatarUrl) deleteUploadedFile(current.avatarUrl);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: newUrl },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    res.json({ message: 'Foto profil berhasil diperbarui', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengunggah foto profil' });
  }
}

// DELETE /api/users/me/avatar -> hapus foto profil sendiri, kembali ke avatar default
async function deleteMyAvatar(req, res) {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (current.avatarUrl) deleteUploadedFile(current.avatarUrl);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: defaultAvatar(current.email) },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    res.json({ message: 'Foto profil berhasil dihapus', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus foto profil' });
  }
}

// POST /api/users/:id/avatar -> admin mengunggah/mengganti foto profil akun manapun
async function uploadUserAvatar(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'File foto wajib diunggah' });
    }

    const current = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!current) {
      return res.status(404).json({ message: 'Akun tidak ditemukan' });
    }

    const newUrl = `/uploads/avatars/${req.file.filename}`;
    if (current.avatarUrl) deleteUploadedFile(current.avatarUrl);

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { avatarUrl: newUrl },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    res.json({ message: 'Foto profil berhasil diperbarui', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengunggah foto profil' });
  }
}

// DELETE /api/users/:id/avatar -> admin menghapus foto profil akun manapun
async function deleteUserAvatar(req, res) {
  try {
    const { id } = req.params;
    const current = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!current) {
      return res.status(404).json({ message: 'Akun tidak ditemukan' });
    }

    if (current.avatarUrl) deleteUploadedFile(current.avatarUrl);

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { avatarUrl: defaultAvatar(current.email) },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    res.json({ message: 'Foto profil berhasil dihapus', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus foto profil' });
  }
}

module.exports = {
  getAllUsers,
  uploadMyAvatar,
  deleteMyAvatar,
  uploadUserAvatar,
  deleteUserAvatar,
};
