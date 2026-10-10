import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { WaterReading } from '../../types/waterData';
import { formatMonthName } from '../Timeline/MonthSelector';
import { Activity, Bug } from 'lucide-react';

interface TrendChartProps {
  months: string[];
  stationReadings: WaterReading[];
  selectedMonth: string;
}

type MetricMode = 'dobod' | 'coliform';

export const TrendChart: React.FC<TrendChartProps> = ({
  months,
  stationReadings,
  selectedMonth,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('dobod');

  // Build 8-month array with explicit nulls for missing months
  const chartData = months.map((m) => {
    const reading = stationReadings.find((r) => r.month === m);
    const hasData = reading && reading.status !== 'no_access';

    return {
      month: m,
      monthLabel: formatMonthName(m).split(' ')[0], // "Jan", "Feb"
      do: hasData ? reading.do : null,
      bod: hasData ? reading.bod : null,
      total_coliform: hasData ? reading.total_coliform : null,
      fecal_coliform: hasData ? reading.fecal_coliform : null,
      status: reading?.status || (reading ? 'ok' : 'missing'),
      isCurrentMonth: m === selectedMonth,
    };
  });

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col gap-3">
      {/* Mode Toggle Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            8-Month Water Quality Trends
          </span>
          <span className="text-xs text-slate-500">
            {metricMode === 'dobod'
              ? 'Dissolved Oxygen (DO) & Biochemical Waste (BOD)'
              : 'Coliform Bacteria Counts (Germs & Pathogens)'}
          </span>
        </div>

        {/* Toggle Buttons */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setMetricMode('dobod')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
              metricMode === 'dobod'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DO & BOD</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('coliform')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
              metricMode === 'coliform'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Coliform</span>
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-56 text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#cbd5e1' }}
              unit={metricMode === 'dobod' ? ' mg/L' : ''}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-800 mb-1 border-b border-slate-100 pb-1 flex items-center justify-between gap-3">
                      <span>{formatMonthName(point.month)}</span>
                      {point.isCurrentMonth && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                          Current
                        </span>
                      )}
                    </div>
                    {point.status === 'no_access' ? (
                      <div className="text-amber-700 font-medium">No Access (Sampling not possible)</div>
                    ) : point.status === 'missing' ? (
                      <div className="text-slate-400 italic">No measurement recorded</div>
                    ) : (
                      <div className="space-y-1">
                        {payload.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4">
                            <span style={{ color: entry.color }} className="font-medium">
                              {entry.name}:
                            </span>
                            <span className="font-bold text-slate-800">
                              {entry.value !== null && entry.value !== undefined
                                ? `${entry.value} ${metricMode === 'dobod' ? 'mg/L' : 'MPN/100ml'}`
                                : 'Missing'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
              iconType="circle"
            />

            {metricMode === 'dobod' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="do"
                  name="DO (Dissolved Oxygen)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false} // Leave gaps for missing months!
                />
                <Line
                  type="monotone"
                  dataKey="bod"
                  name="BOD (Organic Waste)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false} // Leave gaps for missing months!
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="total_coliform"
                  name="Total Coliform"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#8b5cf6' }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="fecal_coliform"
                  name="Fecal Coliform"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#f97316' }}
                  connectNulls={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-500 italic">
        * Gaps in lines signify months where the site had no access or was unmeasured.
      </p>
    </div>
  );
};
