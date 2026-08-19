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
 * Kirim notifikasi absensi ke nomor orang tua via Fonnte.
 * @param {string} parentPhone - nomor HP/WA orang tua, contoh "0812xxxxxxx"
 * @param {string} studentName - nama siswa
 * @param {'PRESENT'|'SICK'|'IZIN'|'ALPHA'} status - status kehadiran
 * @param {Date} [date] - tanggal absensi, default sekarang
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendAttendanceNotification(parentPhone, studentName, status, date = new Date()) {
  const message = buildMessage(studentName, status, date);

  // Kalau API key belum diisi di .env, tetap simulasi via console.log
  // supaya tidak error saat development.
  if (!process.env.WHATSAPP_API_KEY) {
    console.log(
      `[NOTIF-SIMULASI] Mengirim WA ke ${parentPhone}: Siswa ${studentName} telah ${STATUS_LABEL[status]} pada ${new Date(
        date
      ).toLocaleDateString('id-ID')}`
    );
    return { success: true, message };
  }

  try {
    const body = new URLSearchParams();
    body.append('target', parentPhone);
    body.append('message', message);

    const response = await fetch(process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.WHATSAPP_API_KEY,
      },
      body,
    });

    const data = await response.json();
    console.log(`[NOTIF] Respons Fonnte untuk ${parentPhone}:`, data);

    return { success: data.status !== false, message };
  } catch (err) {
    console.error(`[NOTIF] Gagal mengirim WA ke ${parentPhone}:`, err.message);
    return { success: false, message: err.message };
  }
}

module.exports = { sendAttendanceNotification };
