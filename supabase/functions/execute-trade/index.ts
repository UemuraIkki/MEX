import { createClient } from 'jsr:@supabase/supabase-js@2'
import { calcBuy, calcSell, validateSlippage } from './amm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { ticker, side, amount, userId, slippageTolerance = '1' } = await req.json()

    // 銘柄取得（行ロック）
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('*')
      .eq('ticker', ticker)
      .eq('is_active', true)
      .single()

    if (stockError || !stock) {
      return new Response(
        JSON.stringify({ error: 'Stock not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const state = {
      stockPool: stock.stock_pool.toString(),
      mpointPool: stock.mpoint_pool.toString(),
    }

    // AMM計算
    let stockAmount: string
    let mpointAmount: string
    let newStockPool: string
    let newMpointPool: string
    let newK: string
    let avgPrice: string

    if (side === 'buy') {
      const result = calcBuy(state, amount.toString())
      stockAmount = result.stockOut
      mpointAmount = amount.toString()
      newStockPool = result.newStockPool
      newMpointPool = result.newMpointPool
      newK = result.newK
      avgPrice = result.avgPrice

      // スリッページチェック
      const spotPrice = (stock.mpoint_pool / stock.stock_pool).toString()
      if (!validateSlippage(spotPrice, result.avgPrice, slippageTolerance)) {
        return new Response(
          JSON.stringify({ error: 'Slippage too high' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const result = calcSell(state, amount.toString())
      stockAmount = amount.toString()
      mpointAmount = result.mpointOut
      newStockPool = result.newStockPool
      newMpointPool = result.newMpointPool
      newK = result.newK
      avgPrice = result.avgPrice
    }

    // pending_trades に予約
    const { data: pending, error: pendingError } = await supabase
      .from('pending_trades')
      .insert({
        user_id: userId,
        stock_id: stock.id,
        side,
        mpoint_amount: parseFloat(mpointAmount),
        expected_stock: parseFloat(stockAmount),
        status: 'pending',
      })
      .select()
      .single()

    if (pendingError || !pending) {
      return new Response(
        JSON.stringify({ error: 'Failed to create pending trade' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TODO: Phase 3でMpoint API送金をここに追加

    // DB更新（stocks, holdings, trades, price_history）
    const fee = parseFloat(mpointAmount) * 0.003

    const { error: stockUpdateError } = await supabase
      .from('stocks')
      .update({
        stock_pool: parseFloat(newStockPool),
        mpoint_pool: parseFloat(newMpointPool),
        k_constant: parseFloat(newK),
      })
      .eq('id', stock.id)

    if (stockUpdateError) throw stockUpdateError

    // holdings更新
    const quantityDelta = side === 'buy' ? parseFloat(stockAmount) : -parseFloat(stockAmount)

    const { data: existingHolding } = await supabase
      .from('holdings')
      .select('quantity')
      .eq('user_id', userId)
      .eq('stock_id', stock.id)
      .single()

    if (existingHolding) {
      await supabase
        .from('holdings')
        .update({ quantity: existingHolding.quantity + quantityDelta, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('stock_id', stock.id)
    } else {
      await supabase
        .from('holdings')
        .insert({ user_id: userId, stock_id: stock.id, quantity: quantityDelta })
    }

    // trades記録
    await supabase.from('trades').insert({
      user_id: userId,
      stock_id: stock.id,
      side,
      mpoint_amount: parseFloat(mpointAmount),
      stock_amount: parseFloat(stockAmount),
      price: parseFloat(avgPrice),
      fee,
    })

    // price_history記録
    await supabase.from('price_history').insert({
      stock_id: stock.id,
      price: parseFloat(avgPrice),
    })

    // pending_trades を completed に
    await supabase
      .from('pending_trades')
      .update({ status: 'confirmed' })
      .eq('id', pending.id)

    return new Response(
      JSON.stringify({
        success: true,
        trade: {
          side,
          mpointAmount: parseFloat(mpointAmount),
          stockAmount: parseFloat(stockAmount),
          avgPrice: parseFloat(avgPrice),
          fee,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
