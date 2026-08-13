/**
 * Service untuk mengirim notifikasi WhatsApp ke orang tua/wali murid.
 *
 * SAAT INI: hanya simulasi (console.log) agar bisa langsung dicoba tanpa API key.
 * UNTUK PRODUCTION: ganti isi fungsi sendAttendanceNotification dengan pemanggilan
 * API WhatsApp Gateway sungguhan, misalnya Fonnte (https://fonnte.com) atau WAPi.
 *
 * Contoh implementasi nyata dengan Fonnte (uncomment & sesuaikan saat siap production):
 *
 * const axios = require('axios');
 * async function sendAttendanceNotification(parentPhone, studentName, status) {
 *   const message = buildMessage(studentName, status);
 *   const response = await axios.post(
 *     process.env.WHATSAPP_API_URL,
 *     { target: parentPhone, message },
 *     { headers: { Authorization: process.env.WHATSAPP_API_KEY } }
 *   );
 *   return response.data;
 * }
 */

const STATUS_LABEL = {
  PRESENT: 'HADIR',
  SICK: 'SAKIT',
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
 * Kirim notifikasi absensi ke nomor orang tua.
 * @param {string} parentPhone - nomor HP/WA orang tua, contoh "0812xxxxxxx"
 * @param {string} studentName - nama siswa
 * @param {'PRESENT'|'SICK'|'ALPHA'} status - status kehadiran
 * @param {Date} [date] - tanggal absensi, default sekarang
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendAttendanceNotification(parentPhone, studentName, status, date = new Date()) {
  const message = buildMessage(studentName, status, date);

  // ---- SIMULASI: ganti blok ini dengan pemanggilan API WA asli saat production ----
  console.log(
    `[NOTIF] Mengirim WA ke ${parentPhone}: Siswa ${studentName} telah ${STATUS_LABEL[status]} pada ${new Date(
      date
    ).toLocaleDateString('id-ID')}`
  );
  // ----------------------------------------------------------------------------------

  // Simulasikan latensi jaringan singkat
  await new Promise((resolve) => setTimeout(resolve, 150));

  return { success: true, message };
}

module.exports = { sendAttendanceNotification };
