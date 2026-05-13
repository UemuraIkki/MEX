import Decimal from 'npm:decimal.js'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_DOWN })

export interface AMMState {
  stockPool: string
  mpointPool: string
}

export interface BuyResult {
  stockOut: string
  newStockPool: string
  newMpointPool: string
  newK: string
  priceImpact: string
  avgPrice: string
}

export interface SellResult {
  mpointOut: string
  newStockPool: string
  newMpointPool: string
  newK: string
  priceImpact: string
  avgPrice: string
}

export interface EventResult {
  newMpointPool: string
  newK: string
  newPrice: string
}

const FEE_RATE = new Decimal('0.997') // 0.3%手数料

// 現在の理論価格
export function getSpotPrice(state: AMMState): string {
  const s = new Decimal(state.stockPool)
  const m = new Decimal(state.mpointPool)
  return m.div(s).toFixed(8)
}

// 買い注文の試算
export function calcBuy(state: AMMState, mpointIn: string): BuyResult {
  const s = new Decimal(state.stockPool)
  const m = new Decimal(state.mpointPool)
  const k = s.mul(m)
  const mIn = new Decimal(mpointIn)

  // 手数料を差し引いた実効入力
  const effectiveMIn = mIn.mul(FEE_RATE)

  const newM = m.add(effectiveMIn)
  const newS = k.div(newM)
  const stockOut = s.sub(newS)

  const spotPrice = m.div(s)
  const avgPrice = mIn.div(stockOut)
  const priceImpact = avgPrice.sub(spotPrice).div(spotPrice).mul(100)

  return {
    stockOut: stockOut.toFixed(8),
    newStockPool: newS.toFixed(8),
    newMpointPool: newM.toFixed(8),
    newK: newS.mul(newM).toFixed(8),
    priceImpact: priceImpact.toFixed(4),
    avgPrice: avgPrice.toFixed(8),
  }
}

// 売り注文の試算
export function calcSell(state: AMMState, stockIn: string): SellResult {
  const s = new Decimal(state.stockPool)
  const m = new Decimal(state.mpointPool)
  const k = s.mul(m)
  const sIn = new Decimal(stockIn)

  // 手数料を差し引いた実効入力
  const effectiveSIn = sIn.mul(FEE_RATE)

  const newS = s.add(effectiveSIn)
  const newM = k.div(newS)
  const mpointOut = m.sub(newM)

  const spotPrice = m.div(s)
  const avgPrice = mpointOut.div(sIn)
  const priceImpact = spotPrice.sub(avgPrice).div(spotPrice).mul(100)

  return {
    mpointOut: mpointOut.toFixed(8),
    newStockPool: newS.toFixed(8),
    newMpointPool: newM.toFixed(8),
    newK: newS.mul(newM).toFixed(8),
    priceImpact: priceImpact.toFixed(4),
    avgPrice: avgPrice.toFixed(8),
  }
}

// イベントによるプール操作
export function applyEvent(state: AMMState, impactPct: string): EventResult {
  const s = new Decimal(state.stockPool)
  const m = new Decimal(state.mpointPool)
  const impact = new Decimal(impactPct).div(100).add(1)

  const newM = m.mul(impact)
  const newK = s.mul(newM)
  const newPrice = newM.div(s)

  return {
    newMpointPool: newM.toFixed(8),
    newK: newK.toFixed(8),
    newPrice: newPrice.toFixed(8),
  }
}

// スリッページチェック
export function validateSlippage(
  expectedPrice: string,
  actualPrice: string,
  tolerancePct: string
): boolean {
  const expected = new Decimal(expectedPrice)
  const actual = new Decimal(actualPrice)
  const tolerance = new Decimal(tolerancePct).div(100)

  const diff = actual.sub(expected).abs().div(expected)
  return diff.lte(tolerance)
}
