import { BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { GlassCard } from '@/components/GlassCard'

import { demoRevenueSeries } from './demoData'

export function PortfolioOverview() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <BarChart3 className="size-6 text-[#0866F8]" />
          Portfolio Overview
        </h2>
        <span className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
          Last 6 months
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Monthly revenue in ₹ lakh (demo data)</p>

      <div
        role="img"
        aria-label="Area chart of monthly revenue over the last six months, rising from 1.8 to 4.8 lakh rupees."
        className="mt-4 h-72 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={demoRevenueSeries} margin={{ top: 10, right: 16, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0866F8" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#0866F8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#1D2349" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#8991B7', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#8991B7', fontSize: 12 }}
              tickFormatter={(v) => (v === 0 ? '0' : `${v}L`)}
            />
            <Tooltip
              formatter={(value) => [`₹${value}L`, 'Revenue']}
              contentStyle={{
                background: '#0C1030',
                border: '1px solid #1D2349',
                borderRadius: 12,
                color: '#F9F9FC',
              }}
              labelStyle={{ color: '#8991B7' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0866F8"
              strokeWidth={2.5}
              fill="url(#portfolio-fill)"
              dot={{ r: 4, fill: '#0866F8', stroke: '#0866F8' }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>Monthly revenue in lakh rupees (demo data)</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue (₹ lakh)</th>
          </tr>
        </thead>
        <tbody>
          {demoRevenueSeries.map((row) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  )
}