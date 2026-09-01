// Grafik radar (spider chart) untuk 5 kategori Assessment: Speaking, Listening, Vocabulary, Reading, Grammar
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function AssessmentChart({ speaking, listening, vocabulary, reading, grammar }) {
  const data = [
    { category: 'Speaking', nilai: speaking ?? 0 },
    { category: 'Listening', nilai: listening ?? 0 },
    { category: 'Vocabulary', nilai: vocabulary ?? 0 },
    { category: 'Reading', nilai: reading ?? 0 },
    { category: 'Grammar', nilai: grammar ?? 0 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: '#5B3A21' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Radar name="Nilai" dataKey="nilai" stroke="#FFC72C" fill="#FFC72C" fillOpacity={0.45} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
