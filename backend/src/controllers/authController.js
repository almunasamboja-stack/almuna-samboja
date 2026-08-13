// Controller untuk register & login
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res) {
  try {
    const { name, email, password, role, courseId, address, parentPhone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const finalRole = role === 'TEACHER' || role === 'ADMIN' ? role : 'STUDENT';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: finalRole,
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
        // Jika role STUDENT, buat profil Student sekaligus (one-to-one)
        // Status default "PENDING" - harus disetujui admin dulu sebelum aktif penuh
        student:
          finalRole === 'STUDENT'
            ? {
                create: {
                  courseId: courseId ? Number(courseId) : undefined,
                  address: address || '-',
                  parentPhone: parentPhone || '-',
                  status: 'PENDING',
                },
              }
            : undefined,
      },
      include: { student: true },
    });

    const token = signToken(user);
    res.status(201).json({
      message:
        finalRole === 'STUDENT'
          ? 'Registrasi berhasil. Akun Anda menunggu persetujuan admin.'
          : 'Registrasi berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        studentStatus: user.student?.status || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal melakukan registrasi' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: { select: { status: true } } },
    });
    if (!user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const token = signToken(user);
    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        studentStatus: user.student?.status || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal melakukan login' });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
}

// PUT /api/auth/password -> ganti password sendiri (berlaku untuk admin, guru, siswa)
// body: { currentPassword, newPassword }
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan password baru wajib diisi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Password lama tidak sesuai' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ message: 'Password berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengganti password' });
  }
}

module.exports = { register, login, me, changePassword };
