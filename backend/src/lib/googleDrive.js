// Koneksi ke Google Drive API menggunakan Service Account
// Dipakai untuk menampilkan daftar & isi file soal ujian yang disimpan admin di Google Drive
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : null;

  if (!keyFilePath || !fs.existsSync(keyFilePath)) {
    throw new Error(
      'File kredensial Google (GOOGLE_APPLICATION_CREDENTIALS) tidak ditemukan. Cek pengaturan .env dan file google-credentials.json.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

// Daftar file di dalam folder Google Drive tertentu (folder soal ujian)
async function listFilesInFolder(folderId) {
  const drive = getDriveClient();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, thumbnailLink)',
    orderBy: 'name',
    pageSize: 100,
  });
  return response.data.files || [];
}

module.exports = { getDriveClient, listFilesInFolder };
