// Ringkasan per siswa: nilai rata-rata + grafik garis untuk (1) ujian/tugas, (2) nilai harian/bulanan, (3) absensi.
// Ujian/tugas yang tenggatnya sudah lewat dan tidak dikerjakan dihitung nilai 0 (ikut rata-rata & grafik).
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Warna seri: hijau merek + biru (sudah divalidasi CVD & kontras); teks memakai warna netral, bukan warna seri.
const COLOR_MAIN = '#1B6E3C';
const COLOR_SECOND = '#2F6FDB';
const INK = '#475569';
const GRID = '#E2E8F0';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function shortDate(d) {
  const x = new Date(d);
  return `${x.getDate()} ${SHORT_MONTHS[x.getMonth()]} ${String(x.getFullYear()).slice(2)}`;
}

function average(values) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function Stat({ label, value, hint }) {
  return (
    <div className="bg-surface rounded-lg px-3 py-2 text-center min-w-[96px]">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-navy text-lg leading-tight">{value ?? '-'}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// Titik: berisi (terisi) untuk data biasa, berongga untuk "tidak dikerjakan" supaya tidak hanya bergantung warna
function makeDot(color) {
  return function Dot({ cx, cy, payload, dataKey }) {
    if (cx === undefined || cy === undefined || payload[dataKey] === null || payload[dataKey] === undefined) return null;
    const hollow = payload.missed && dataKey === 'score';
    return <circle cx={cx} cy={cy} r={4.5} fill={hollow ? '#fff' : color} stroke={hollow ? color : '#fff'} strokeWidth={2} />;
  };
}

function ChartTooltip({ active, payload, unit = '' }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow px-3 py-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-700 mb-1">{row.tooltipTitle || row.x}</p>
      {row.tooltipSub && <p className="text-slate-400 mb-1">{row.tooltipSub}</p>}
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <p key={p.dataKey} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ background: p.stroke }} />
            {p.name}: <span className="font-semibold">{p.value}{unit}</span>
          </p>
        ))}
      {row.missed && <p className="text-maroon mt-1">Tidak dikerjakan sampai tenggat</p>}
    </div>
  );
}

function Chart({ data, series, unit }) {
  return (
    <div style={{ width: '100%', height: 230 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: INK }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: INK }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: INK }} />}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              connectNulls
              dot={makeDot(s.color)}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ title, subtitle, stats, children }) {
  return (
    <div className="card">
      <p className="font-bold text-navy">{title}</p>
      <p className="text-xs text-slate-400 mb-3">{subtitle}</p>
      <div className="flex flex-wrap gap-2 mb-4">{stats}</div>
      {children}
    </div>
  );
}

export default function StudentProgressSummary({ data }) {
  // ---------- 1. UJIAN / TUGAS ----------
  const examPoints = [
    ...data.examAttempts.map((a) => ({
      ts: new Date(a.submittedAt).getTime(),
      score: a.score,
      title: a.exam?.title || 'Ujian',
      missed: false,
    })),
    ...(data.missedExams || []).map((m) => ({
      ts: new Date(m.deadline).getTime(),
      score: 0,
      title: m.title,
      missed: true,
    })),
  ].sort((a, b) => a.ts - b.ts);
  const examAvg = average(examPoints.map((p) => p.score));
  const missedCount = examPoints.filter((p) => p.missed).length;
  const examChart = examPoints.map((p) => ({
    x: shortDate(p.ts),
    score: p.score,
    missed: p.missed,
    tooltipTitle: p.title,
    tooltipSub: p.missed ? `Tenggat ${shortDate(p.ts)}` : shortDate(p.ts),
  }));

  // ---------- 2. NILAI HARIAN / BULANAN ----------
  const gradePoints = [...data.grades].sort((a, b) => new Date(a.date) - new Date(b.date));
  const dailyAvg = average(data.grades.filter((g) => g.type === 'DAILY').map((g) => g.score));
  const monthlyAvg = average(data.grades.filter((g) => g.type === 'MONTHLY').map((g) => g.score));
  const gradeChart = gradePoints.map((g) => ({
    x: shortDate(g.date),
    harian: g.type === 'DAILY' ? g.score : null,
    bulanan: g.type === 'MONTHLY' ? g.score : null,
    tooltipTitle: g.subject,
    tooltipSub: shortDate(g.date),
  }));

  // ---------- 3. ABSENSI (persentase hadir per bulan) ----------
  const att = data.attendances;
  const count = (st) => att.filter((a) => a.status === st).length;
  const present = count('PRESENT');
  const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : null;
  const byMonth = {};
  att.forEach((a) => {
    const d = new Date(a.date);
    const key = d.getFullYear() * 100 + d.getMonth();
    byMonth[key] = byMonth[key] || { present: 0, total: 0, year: d.getFullYear(), month: d.getMonth() };
    byMonth[key].total += 1;
    if (a.status === 'PRESENT') byMonth[key].present += 1;
  });
  const attChart = Object.keys(byMonth)
    .sort((a, b) => a - b)
    .map((k) => {
      const m = byMonth[k];
      return {
        x: `${SHORT_MONTHS[m.month]} ${String(m.year).slice(2)}`,
        kehadiran: Math.round((m.present / m.total) * 100),
        tooltipTitle: `${SHORT_MONTHS[m.month]} ${m.year}`,
        tooltipSub: `${m.present} hadir dari ${m.total} pertemuan`,
      };
    });

  return (
    <div className="space-y-4 mb-6">
      <Card
        title="Nilai Ujian/Tugas"
        subtitle="Tugas yang tidak dikerjakan sampai tenggat dihitung nilai 0 (titik berongga)."
        stats={
          <>
            <Stat label="Rata-rata" value={examAvg} />
            <Stat label="Dikerjakan" value={data.examAttempts.length} />
            <Stat label="Tidak dikerjakan" value={missedCount} hint="nilai 0" />
          </>
        }
      >
        {examChart.length > 0 ? (
          <Chart data={examChart} series={[{ key: 'score', name: 'Nilai', color: COLOR_MAIN }]} />
        ) : (
          <p className="text-sm text-slate-400">Belum ada data ujian/tugas.</p>
        )}
      </Card>

      <Card
        title="Nilai Harian & Bulanan"
        subtitle="Perkembangan nilai dari waktu ke waktu."
        stats={
          <>
            <Stat label="Rata-rata Harian" value={dailyAvg} />
            <Stat label="Rata-rata Bulanan" value={monthlyAvg} />
            <Stat label="Jumlah nilai" value={data.grades.length} />
          </>
        }
      >
        {gradeChart.length > 0 ? (
          <Chart
            data={gradeChart}
            series={[
              { key: 'harian', name: 'Harian', color: COLOR_MAIN },
              { key: 'bulanan', name: 'Bulanan', color: COLOR_SECOND },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-400">Belum ada data nilai harian/bulanan.</p>
        )}
      </Card>

      <Card
        title="Absensi"
        subtitle="Persentase kehadiran per bulan."
        stats={
          <>
            <Stat label="% Kehadiran" value={attPct === null ? null : `${attPct}%`} />
            <Stat label="Hadir" value={present} />
            <Stat label="Sakit" value={count('SICK')} />
            <Stat label="Izin" value={count('IZIN')} />
            <Stat label="Alpha" value={count('ALPHA')} />
          </>
        }
      >
        {attChart.length > 0 ? (
          <Chart data={attChart} series={[{ key: 'kehadiran', name: 'Kehadiran', color: COLOR_MAIN }]} unit="%" />
        ) : (
          <p className="text-sm text-slate-400">Belum ada data absensi.</p>
        )}
      </Card>
    </div>
  );
}
