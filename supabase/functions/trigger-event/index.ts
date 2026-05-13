import { createClient } from 'jsr:@supabase/supabase-js@2'
import { applyEvent } from './amm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// イベント定義
const EVENT_TYPES = [
  { type: 'earnings_good',  headline: '好決算を発表',     minImpact: 5,   maxImpact: 15,  probability: 0.02, target: 'single' },
  { type: 'earnings_bad',   headline: '赤字決算を発表',   minImpact: -15, maxImpact: -5,  probability: 0.02, target: 'single' },
  { type: 'new_product',    headline: '新製品を発表',     minImpact: 3,   maxImpact: 8,   probability: 0.05, target: 'single' },
  { type: 'scandal',        headline: '不祥事が発覚',     minImpact: -30, maxImpact: -10, probability: 0.01, target: 'single' },
  { type: 'ma_rumor',       headline: 'M&A噂が浮上',     minImpact: 1,   maxImpact: 5,   probability: 0.08, target: 'single' },
  { type: 'market_crash',   headline: '市場全体が急落',   minImpact: -20, maxImpact: -5,  probability: 0.005, target: 'all' },
  { type: 'market_boom',    headline: '市場全体が急騰',   minImpact: 3,   maxImpact: 10,  probability: 0.003, target: 'all' },
]

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // アクティブな銘柄を取得
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('*')
      .eq('is_active', true)

    if (stocksError || !stocks || stocks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active stocks' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const generatedEvents = []

    for (const eventDef of EVENT_TYPES) {
      if (Math.random() > eventDef.probability) continue

      const impactPct = randomBetween(eventDef.minImpact, eventDef.maxImpact)
      const targetStocks = eventDef.target === 'all'
        ? stocks
        : [stocks[Math.floor(Math.random() * stocks.length)]]

      for (const stock of targetStocks) {
        const state = {
          stockPool: stock.stock_pool.toString(),
          mpointPool: stock.mpoint_pool.toString(),
        }

        const result = applyEvent(state, impactPct.toString())

        // プール更新
        await supabase
          .from('stocks')
          .update({
            mpoint_pool: parseFloat(result.newMpointPool),
            k_constant: parseFloat(result.newK),
          })
          .eq('id', stock.id)

        // price_history記録
        await supabase.from('price_history').insert({
          stock_id: stock.id,
          price: parseFloat(result.newPrice),
        })

        // イベント記録
        const headline = `${stock.name}が${eventDef.headline}`
        await supabase.from('events').insert({
          stock_id: eventDef.target === 'all' ? null : stock.id,
          event_type: eventDef.type,
          impact_pct: impactPct,
          headline,
        })

        generatedEvents.push({ stock: stock.ticker, event: eventDef.type, impact: impactPct })
      }
    }

    return new Response(
      JSON.stringify({ success: true, events: generatedEvents }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})