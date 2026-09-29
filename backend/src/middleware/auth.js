// Middleware untuk melindungi route yang butuh autentikasi JWT
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan, silakan login kembali' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa' });
  }
}

// Middleware tambahan untuk membatasi akses berdasarkan role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke resource ini' });
    }
    next();
  };
}

// Middleware tambahan: khusus untuk route yang diakses siswa sendiri.
// Memastikan akun siswa yang statusnya belum APPROVED (masih PENDING atau REJECTED)
// tidak bisa mengakses data/fitur apa pun di aplikasi, walaupun sudah login.
// ADMIN dan TEACHER tidak terpengaruh oleh pengecekan ini.
async function requireApprovedStudent(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'STUDENT') {
      return next();
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: { status: true },
    });

    if (!student || student.status !== 'APPROVED') {
      return res.status(403).json({
        message:
          'Akun Anda belum disetujui oleh admin. Silakan tunggu konfirmasi sebelum bisa mengakses fitur ini.',
        studentStatus: student ? student.status : 'PENDING',
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memverifikasi status akun' });
  }
}

module.exports = { authMiddleware, requireRole, requireApprovedStudent };
