// Controller kirim pesan WhatsApp massal ke wali murid (dipilih manual via checkbox) - khusus admin
const prisma = require('../lib/prisma');
const { sendMessage } = require('../services/whatsappService');

// GET /api/broadcast/recipients?courseId=X -> daftar siswa (untuk pilihan checkbox), difilter per kelas
async function getRecipients(req, res) {
  try {
    const { courseId } = req.query;

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        ...(courseId ? { enrollments: { some: { courseId: Number(courseId) } } } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { name: true } } } },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      class: s.enrollments.length > 0 ? s.enrollments.map((e) => e.course.name).join(', ') : 'Belum ada kelas',
      parentPhone: s.parentPhone,
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil daftar penerima' });
  }
}

// POST /api/broadcast/send -> kirim pesan ke nomor-nomor yang dipilih (admin)
// body: { studentIds: [1,2,3], message: "..." }
async function sendBroadcast(req, res) {
  try {
    const { studentIds, message } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Pilih minimal 1 penerima' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Isi pesan wajib diisi' });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds.map((id) => Number(id)) } },
      include: { user: { select: { name: true } } },
    });

    const results = [];
    for (const s of students) {
      // Kirim satu per satu (bukan Promise.all) supaya tidak membanjiri API Fonnte sekaligus
      const result = await sendMessage(s.parentPhone, message.trim());
      results.push({
        studentId: s.id,
        name: s.user.name,
        parentPhone: s.parentPhone,
        success: result.success,
      });
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.length - sentCount;

    res.json({
      message: `Terkirim ke ${sentCount} nomor${failedCount > 0 ? `, gagal ${failedCount} nomor` : ''}.`,
      results,
      sentCount,
      failedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengirim pesan broadcast' });
  }
}

module.exports = { getRecipients, sendBroadcast };
