// Recharts wrappers themed for Game Script (copper line, dark grid).
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const axisStyle = { fontSize: 10, fontFamily: 'var(--font-data)', fill: '#8a9ba8' };

const tooltipStyle = {
  background: '#0a1420',
  border: '1px solid #1a3048',
  borderRadius: 2,
  fontFamily: 'var(--font-data)',
  fontSize: 12,
};

// P&L area chart with optional accuracy line overlay.
export function PnlChart({ data, xKey = 'week', valueKey = 'cumulative', accuracyKey = 'accuracy', height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gsCopper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4762a" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#c4762a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1a3048" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} stroke="#1a3048" />
        <YAxis tick={axisStyle} stroke="#1a3048" />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#ede8dc' }} />
        <Area type="monotone" dataKey={valueKey} stroke="#c4762a" strokeWidth={2} fill="url(#gsCopper)" />
        {accuracyKey && (
          <Line type="monotone" dataKey={accuracyKey} stroke="#8a9ba8" strokeWidth={1} dot={false} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
