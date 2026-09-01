/**
 * Service untuk mengirim notifikasi WhatsApp ke orang tua/wali murid.
 * Terhubung ke Fonnte (https://fonnte.com) - WhatsApp Gateway.
 */

const STATUS_LABEL = {
  PRESENT: 'HADIR',
  SICK: 'SAKIT',
  IZIN: 'IZIN',
  ALPHA: 'ALPHA (tanpa keterangan)',
};

function buildMessage(studentName, status, date) {
  const label = STATUS_LABEL[status] || status;
  const formattedDate = new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `[Almuna Samboja] Ananda ${studentName} tercatat ${label} pada ${formattedDate}.`;
}

/**
 * Kirim pesan WhatsApp bebas (teks apa saja) ke satu nomor via Fonnte.
 * Dipakai untuk notifikasi otomatis maupun broadcast manual oleh admin.
 * @param {string} phone - nomor HP/WA tujuan, contoh "0812xxxxxxx"
 * @param {string} message - isi pesan
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendMessage(phone, message) {
  // Kalau API key belum diisi di .env, tetap simulasi via console.log
  // supaya tidak error saat development.
  if (!process.env.WHATSAPP_API_KEY) {
    console.log(`[NOTIF-SIMULASI] Mengirim WA ke ${phone}: ${message}`);
    return { success: true, message };
  }

  try {
    const body = new URLSearchParams();
    body.append('target', phone);
    body.append('message', message);

    const response = await fetch(process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.WHATSAPP_API_KEY,
      },
      body,
    });

    const data = await response.json();
    console.log(`[NOTIF] Respons Fonnte untuk ${phone}:`, data);

    return { success: data.status !== false, message };
  } catch (err) {
    console.error(`[NOTIF] Gagal mengirim WA ke ${phone}:`, err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Kirim notifikasi absensi ke nomor orang tua via Fonnte.
 * @param {string} parentPhone - nomor HP/WA orang tua, contoh "0812xxxxxxx"
 * @param {string} studentName - nama siswa
 * @param {'PRESENT'|'SICK'|'IZIN'|'ALPHA'} status - status kehadiran
 * @param {Date} [date] - tanggal absensi, default sekarang
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendAttendanceNotification(parentPhone, studentName, status, date = new Date()) {
  const message = buildMessage(studentName, status, date);
  return sendMessage(parentPhone, message);
}

module.exports = { sendAttendanceNotification, sendMessage };
