/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palet kuning-hijau modern & ceria (kombinasi warna logo)
        navy: '#1B6E3C',      // hijau tua - dipakai untuk teks utama, navbar aktif & elemen gelap (nama var dipertahankan agar class lama tetap kompatibel)
        gold: '#FFC72C',      // kuning cerah - warna aksen utama (CTA, highlight)
        leaf: '#3FA34D',      // hijau daun cerah - aksen sekunder (bukan "green" agar tidak menimpa skala green-500 dst yang dipakai status Hadir)
        maroon: '#D64545',    // merah hangat - dipakai terbatas untuk peringatan/aksen/hapus
        surface: '#FFFDF3',   // putih kekuningan lembut, latar belakang ceria
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
