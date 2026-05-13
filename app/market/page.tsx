import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function MarketPage() {
  const supabase = await createClient()

  const { data: stocks } = await supabase
    .from('stocks')
    .select('*')
    .eq('is_active', true)
    .order('ticker')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-widest">MEX</h1>
        <span className="text-xs text-gray-500 tracking-widest">MARKET</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          {stocks?.map((stock) => {
            const price = (stock.mpoint_pool / stock.stock_pool).toFixed(4)
            return (
              <a
                key={stock.id}
                href={`/market/${stock.ticker}`}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-blue-400 w-12">{stock.ticker}</span>
                  <span className="text-sm text-gray-200">{stock.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-white">{price} Mpt</div>
                </div>
              </a>
            )
          })}
        </div>
      </main >
    </div >
  )
}