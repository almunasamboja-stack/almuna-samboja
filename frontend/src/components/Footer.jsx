export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-20">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/images/logo.png" alt="Logo Almuna Samboja" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg">Almuna Samboja</span>
          </div>
          <p className="text-sm text-slate-300">
            Lembaga kursus terpadu di Samboja untuk membentuk generasi cerdas dan berakhlak.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Kontak</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Jln Handil Balikpapan 2 RT.02 Kel. Sei Seluang, Kec. Samboja, Kalimantan Timur</li>
            <li>WhatsApp: 0812 1060 5322</li>
            <li>Email: almunasamboja@gmail.com</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Jam Operasional</h4>
          <p className="text-sm text-slate-300">Senin - Sabtu, 08.00 - 18.00 WITA</p>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-slate-400 py-4">
        © {new Date().getFullYear()} Almuna Samboja. Seluruh hak cipta dilindungi.
      </div>
    </footer>
  );
}
