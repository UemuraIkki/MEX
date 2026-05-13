import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function RankingPage() {
  const supabase = await createClient()

  // 全ユーザーの取引履歴を集計
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name')

  const { data: trades } = await supabase
    .from('trades')
    .select('user_id, side, mpoint_amount')

  // ユーザーごとの損益計算
  const pnlMap: Record<string, number> = {}

  trades?.forEach((t) => {
    if (!pnlMap[t.user_id]) pnlMap[t.user_id] = 0
    if (t.side === 'sell') pnlMap[t.user_id] += Number(t.mpoint_amount)
    if (t.side === 'buy') pnlMap[t.user_id] -= Number(t.mpoint_amount)
  })

  const ranking = users
    ?.map((u) => ({
      ...u,
      pnl: pnlMap[u.id] || 0,
    }))
    .sort((a, b) => b.pnl - a.pnl)

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-widest">MEX</h1>
        <span className="text-xs text-gray-500 tracking-widest">RANKING</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
          <div className="text-xs text-gray-500 tracking-widest mb-4">SEASON RANKING</div>
          {ranking && ranking.length > 0 ? (
            <div className="flex flex-col gap-3">
              {ranking.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-mono w-6 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-200">{u.display_name}</span>
                  </div>
                  <span className={`text-sm font-mono ${u.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {u.pnl >= 0 ? '+' : ''}{u.pnl.toFixed(2)} Mpt
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">データなし</p>
          )}
        </div>
      </main>
    </div>
  )
}
