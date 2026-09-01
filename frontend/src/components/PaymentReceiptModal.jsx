// Modal Nota Pembayaran SPP - bisa dicetak/disimpan sebagai PDF lewat dialog print browser
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const METHOD_LABEL = { CASH: 'Tunai', TRANSFER: 'Transfer' };

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function PaymentReceiptModal({ payment, onClose }) {
  if (!payment) return null;

  const nomorNota = `SPP/${payment.periodYear}${String(payment.periodMonth).padStart(2, '0')}/${String(payment.id).padStart(4, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-0 my-8 print:shadow-none print:rounded-none print:max-w-full">
        {/* AREA YANG DICETAK */}
        <div id="receipt-print-area" className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <img src="/images/logo.png" alt="Logo Almuna Samboja" className="w-12 h-12 object-contain" />
            <div>
              <p className="font-bold text-navy text-lg leading-tight">Almuna Samboja</p>
              <p className="text-xs text-slate-500">Jln Handil Balikpapan 2 RT.02 Kel. Sei Seluang, Kec. Samboja</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Nota Pembayaran SPP</p>
            <p className="text-xs text-slate-400 mt-1">No. {nomorNota}</p>
          </div>

          <table className="w-full text-sm mb-6">
            <tbody>
              <tr>
                <td className="py-1.5 text-slate-500 w-36">Nama Siswa</td>
                <td className="py-1.5 font-medium text-navy">: {payment.student?.user?.name}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-500">Kelas</td>
                <td className="py-1.5 font-medium text-navy">: {payment.course?.name || '-'}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-500">Periode SPP</td>
                <td className="py-1.5 font-medium text-navy">: {MONTHS[payment.periodMonth - 1]} {payment.periodYear}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-500">Tanggal Bayar</td>
                <td className="py-1.5 font-medium text-navy">
                  : {new Date(payment.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-500">Metode</td>
                <td className="py-1.5 font-medium text-navy">: {METHOD_LABEL[payment.method]}</td>
              </tr>
              {payment.notes && (
                <tr>
                  <td className="py-1.5 text-slate-500 align-top">Keterangan</td>
                  <td className="py-1.5 font-medium text-navy">: {payment.notes}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bg-surface rounded-xl p-4 flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-navy">Jumlah Dibayar</span>
            <span className="text-2xl font-extrabold text-navy">{formatRupiah(payment.amount)}</span>
          </div>

          <div className="flex justify-between items-end text-xs text-slate-400 mt-10">
            <p>Nota dicetak otomatis oleh sistem</p>
            <div className="text-center">
              <p className="mb-10">Diterima oleh,</p>
              <p className="border-t border-slate-300 pt-1 w-32">Admin Almuna Samboja</p>
            </div>
          </div>
        </div>

        {/* TOMBOL AKSI - disembunyikan saat print */}
        <div className="flex gap-3 p-4 border-t border-slate-100 print:hidden">
          <button onClick={onClose} className="flex-1 btn-outline">
            Tutup
          </button>
          <button onClick={() => window.print()} className="flex-1 btn-primary">
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>
    </div>
  );
}
