'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface PricePoint {
  price: number
  recorded_at: string
}

export default function PriceChart({ history }: { history: PricePoint[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-gray-600">
        チャートデータなし
      </div>
    )
  }

  const data = history.map((h) => ({
    price: parseFloat(Number(h.price).toFixed(4)),
    time: new Date(h.recorded_at).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }))

  const prices = data.map((d) => d.price)
  const minPrice = Math.min(...prices) * 0.995
  const maxPrice = Math.max(...prices) * 1.005
  const isUp = prices[prices.length - 1] >= prices[0]

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="time"
          tick={{ fill: '#555', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fill: '#555', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(3)}
          width={48}
        />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 4 }}
          labelStyle={{ color: '#888', fontSize: 10 }}
          itemStyle={{ color: '#fff', fontSize: 11 }}
          formatter={(v: any) => [Number(v).toFixed(4) + ' Mpt', '価格']}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke={isUp ? '#4ade80' : '#f87171'}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
