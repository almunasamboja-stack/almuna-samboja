// Middleware upload file (foto) menggunakan multer.
// Menyediakan 2 instance: uploadAvatar (foto profil) dan uploadGalleryPhoto (galeri kegiatan).
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeStorage(subfolder) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    },
  });
}

function imageFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('File yang diunggah harus berupa gambar'));
  }
  cb(null, true);
}

const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

const uploadGalleryPhoto = multer({
  storage: makeStorage('gallery'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Hapus file fisik di dalam folder uploads berdasarkan URL relatif ("/uploads/avatars/xxx.jpg")
function deleteUploadedFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return; // jangan hapus URL eksternal (pravatar dll)
  const filePath = path.join(__dirname, '../..', relativeUrl);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') console.error('Gagal menghapus file:', err.message);
  });
}

module.exports = { uploadAvatar, uploadGalleryPhoto, deleteUploadedFile };
