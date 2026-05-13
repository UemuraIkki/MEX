import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderPanel from './OrderPanel'

export const revalidate = 0

export default async function StockPage({ params }: { params: { ticker: string } }) {
  const supabase = await createClient()
  const { ticker } = await params

  const { data: stock } = await supabase
    .from('stocks')
    .select('*')
    .eq('ticker', ticker)
    .eq('is_active', true)
    .single()

  if (!stock) notFound()

  const { data: history } = await supabase
    .from('price_history')
    .select('price, recorded_at')
    .eq('stock_id', stock.id)
    .order('recorded_at', { ascending: true })
    .limit(100)

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('stock_id', stock.id)
    .order('occurred_at', { ascending: false })
    .limit(10)

  const price = (stock.mpoint_pool / stock.stock_pool).toFixed(4)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <a href="/market" className="text-gray-500 hover:text-white text-sm">← MARKET</a>
        <span className="text-xs font-mono text-blue-400">{stock.ticker}</span>
        <span className="text-sm text-gray-200">{stock.name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* 価格 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
          <div className="text-3xl font-mono font-bold">{price} Mpt</div>
          <div className="text-xs text-gray-500 mt-1">現在価格</div>
        </div>

        {/* 価格履歴 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
          <div className="text-xs text-gray-500 tracking-widest mb-4">PRICE HISTORY</div>
          {history && history.length > 0 ? (
            <div className="flex flex-col gap-1">
              {history.slice(-10).reverse().map((h, i) => (
                <div key={i} className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">
                    {new Date(h.recorded_at).toLocaleString('ja-JP')}
                  </span>
                  <span className="text-white">{Number(h.price).toFixed(4)} Mpt</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">取引履歴なし</p>
          )}
        </div>

        {/* イベント履歴 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
          <div className="text-xs text-gray-500 tracking-widest mb-4">NEWS</div>
          {events && events.length > 0 ? (
            <div className="flex flex-col gap-2">
              {events.map((e) => (
                <div key={e.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">{e.headline}</span>
                  <span className={Number(e.impact_pct) >= 0 ? 'text-green-400 font-mono' : 'text-red-400 font-mono'}>
                    {Number(e.impact_pct) >= 0 ? '+' : ''}{Number(e.impact_pct).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">ニュースなし</p>
          )}
        </div>

        {/* 注文パネル */}
        <OrderPanel stock={stock} />

      </main>
    </div>
  )
}
