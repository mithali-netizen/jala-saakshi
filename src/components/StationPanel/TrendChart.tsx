import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonitoringLocation } from '../../utils/stations';
import { DO_FISH_RISK } from '../../utils/waterQuality';
import { formatMonth } from '../../utils/months';

interface TrendChartProps {
  location: MonitoringLocation;
  selectedMonth: string;
}

const tick = (m: string) => {
  const y = m.split('-')[0];
  return `${formatMonth(m).split(' ')[0]} ’${y.slice(2)}`;
};

const AXIS = { fontSize: 11, fill: '#64748b' };

export const TrendChart: React.FC<TrendChartProps> = ({ location, selectedMonth }) => {
  const data = useMemo(
    () =>
      location.months
        .map((m) => {
          const r = location.byMonth.get(m)!;
          const ok = r.status !== 'no_access';
          return { month: m, do: ok ? r.do : null, bod: ok ? r.bod : null };
        })
        .filter((d) => d.do != null || d.bod != null),
    [location],
  );

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
        Only {data.length} reading on record, so there is no trend to draw yet.
      </div>
    );
  }

  const selectedInData = data.some((d) => d.month === selectedMonth);
  const xAxis = (
    <XAxis
      dataKey="month"
      tickFormatter={tick}
      tick={AXIS}
      tickLine={false}
      axisLine={{ stroke: '#cbd5e1' }}
      interval="preserveStartEnd"
      minTickGap={28}
    />
  );
  const tooltip = (unit: string, name: string) => (
    <Tooltip
      cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
      formatter={(v) => [`${v} ${unit}`, name]}
      labelFormatter={(m) => formatMonth(String(m))}
      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
    />
  );
  const selectedLine = selectedInData ? (
    <ReferenceLine x={selectedMonth} stroke="#4f46e5" strokeOpacity={0.35} strokeWidth={6} />
  ) : null;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-slate-700">Dissolved oxygen (mg/L)</span>
          <span className="text-[11px] text-slate-500">higher is better</span>
        </div>
        <div className="h-36" role="img" aria-label="Dissolved oxygen over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              {xAxis}
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, (max: number) => Math.max(8, Math.ceil(max))]} />
              {selectedLine}
              <ReferenceLine
                y={DO_FISH_RISK}
                stroke="#be123c"
                strokeDasharray="5 4"
                label={{ value: 'Fish at risk below this', position: 'insideBottomRight', fill: '#be123c', fontSize: 11 }}
              />
              {tooltip('mg/L', 'Dissolved oxygen')}
              <Line type="monotone" dataKey="do" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-slate-700">Waste load, BOD (mg/L)</span>
          <span className="text-[11px] text-slate-500">lower is better</span>
        </div>
        <div className="h-32" role="img" aria-label="Biochemical oxygen demand over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              {xAxis}
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, 'auto']} />
              {selectedLine}
              {tooltip('mg/L', 'BOD')}
              <Line type="monotone" dataKey="bod" stroke="#334155" strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
