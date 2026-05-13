import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function PortfolioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: holdings } = await supabase
    .from('holdings')
    .select(`
      quantity,
      stocks (
        ticker,
        name,
        stock_pool,
        mpoint_pool
      )
    `)
    .eq('user_id', user.id)
    .gt('quantity', 0)

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/market" className="text-gray-500 hover:text-white text-sm">← MARKET</a>
        <span className="text-xs text-gray-500 tracking-widest">PORTFOLIO</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* 保有銘柄 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
          <div className="text-xs text-gray-500 tracking-widest mb-4">HOLDINGS</div>
          {holdings && holdings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {holdings.map((h, i) => {
                const stock = h.stocks as any
                const price = stock.mpoint_pool / stock.stock_pool
                const value = price * Number(h.quantity)
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-blue-400 w-12">{stock.ticker}</span>
                      <span className="text-sm text-gray-200">{stock.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-white">{Number(h.quantity).toFixed(2)} 株</div>
                      <div className="text-xs font-mono text-gray-500">{value.toFixed(2)} Mpt</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-600">保有銘柄なし</p>
          )}
        </div>

        {/* 取引履歴 */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
          <div className="text-xs text-gray-500 tracking-widest mb-4">TRADE HISTORY</div>
          {trades && trades.length > 0 ? (
            <div className="flex flex-col gap-2">
              {trades.map((t) => (
                <div key={t.id} className="flex justify-between items-center text-xs font-mono">
                  <span className={t.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                    {t.side === 'buy' ? 'BUY' : 'SELL'}
                  </span>
                  <span className="text-gray-400">{new Date(t.executed_at).toLocaleString('ja-JP')}</span>
                  <span className="text-white">{Number(t.mpoint_amount).toFixed(2)} Mpt</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">取引履歴なし</p>
          )}
        </div>

      </main>
    </div>
  )
}
