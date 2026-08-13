// Controller galeri kegiatan (foto dashboard publik) - dikelola oleh admin
const prisma = require('../lib/prisma');
const { deleteUploadedFile } = require('../middleware/upload');

// GET /api/gallery -> daftar foto galeri (publik)
async function getGallery(req, res) {
  try {
    const photos = await prisma.galleryPhoto.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil galeri' });
  }
}

// POST /api/gallery -> unggah foto baru ke galeri (khusus admin)
async function uploadGalleryPhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File foto wajib diunggah' });
    }

    const { caption } = req.body;
    const photo = await prisma.galleryPhoto.create({
      data: {
        imageUrl: `/uploads/gallery/${req.file.filename}`,
        caption: caption || null,
      },
    });

    res.status(201).json({ message: 'Foto berhasil ditambahkan ke galeri', photo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengunggah foto galeri' });
  }
}

// DELETE /api/gallery/:id -> hapus foto dari galeri (khusus admin)
async function deleteGalleryPhoto(req, res) {
  try {
    const { id } = req.params;
    const photo = await prisma.galleryPhoto.findUnique({ where: { id: Number(id) } });
    if (!photo) {
      return res.status(404).json({ message: 'Foto tidak ditemukan' });
    }

    deleteUploadedFile(photo.imageUrl);
    await prisma.galleryPhoto.delete({ where: { id: Number(id) } });

    res.json({ message: 'Foto berhasil dihapus dari galeri' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus foto galeri' });
  }
}

module.exports = { getGallery, uploadGalleryPhoto, deleteGalleryPhoto };
