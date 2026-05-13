import {
  getSpotPrice,
  calcBuy,
  calcSell,
  applyEvent,
  validateSlippage,
} from '@/lib/amm'

const initialState = {
  stockPool: '10000',
  mpointPool: '10000',
}

describe('getSpotPrice', () => {
  test('初期プールの価格は1.0', () => {
    expect(getSpotPrice(initialState)).toBe('1.00000000')
  })
})

describe('calcBuy', () => {
  test('100Mpt投入で株を取得できる', () => {
    const result = calcBuy(initialState, '100')
    expect(parseFloat(result.stockOut)).toBeGreaterThan(0)
  })

  test('買い後の新価格は元の価格より高い', () => {
    const result = calcBuy(initialState, '100')
    const newState = {
      stockPool: result.newStockPool,
      mpointPool: result.newMpointPool,
    }
    const newPrice = parseFloat(getSpotPrice(newState))
    expect(newPrice).toBeGreaterThan(1.0)
  })

  test('大口買いはpriceImpactが大きい', () => {
    const result = calcBuy(initialState, '5000')
    expect(parseFloat(result.priceImpact)).toBeGreaterThan(50)
  })

  test('k_constantがほぼ一定', () => {
    const result = calcBuy(initialState, '100')
    const originalK = 10000 * 10000
    const newK = parseFloat(result.newK)
    expect(Math.abs(newK - originalK) / originalK).toBeLessThan(0.01)
  })
})

describe('calcSell', () => {
  test('100株売却でMpointを取得できる', () => {
    const result = calcSell(initialState, '100')
    expect(parseFloat(result.mpointOut)).toBeGreaterThan(0)
  })

  test('売り後の新価格は元の価格より低い', () => {
    const result = calcSell(initialState, '100')
    const newState = {
      stockPool: result.newStockPool,
      mpointPool: result.newMpointPool,
    }
    const newPrice = parseFloat(getSpotPrice(newState))
    expect(newPrice).toBeLessThan(1.0)
  })
})

describe('往復テスト', () => {
  test('買い→売りで手数料分だけ減る', () => {
    const buyResult = calcBuy(initialState, '1000')
    const stateAfterBuy = {
      stockPool: buyResult.newStockPool,
      mpointPool: buyResult.newMpointPool,
    }
    const sellResult = calcSell(stateAfterBuy, buyResult.stockOut)
    const mpointBack = parseFloat(sellResult.mpointOut)
    expect(mpointBack).toBeLessThan(1000)
    expect(mpointBack).toBeGreaterThan(900) // 手数料は10%未満
  })
})

describe('applyEvent', () => {
  test('+10%イベントで価格が上昇する', () => {
    const result = applyEvent(initialState, '10')
    const newState = {
      stockPool: initialState.stockPool,
      mpointPool: result.newMpointPool,
    }
    const newPrice = parseFloat(getSpotPrice(newState))
    expect(newPrice).toBeCloseTo(1.1, 2)
  })

  test('-20%イベントで価格が下落する', () => {
    const result = applyEvent(initialState, '-20')
    const newState = {
      stockPool: initialState.stockPool,
      mpointPool: result.newMpointPool,
    }
    const newPrice = parseFloat(getSpotPrice(newState))
    expect(newPrice).toBeCloseTo(0.8, 2)
  })
})

describe('validateSlippage', () => {
  test('許容範囲内ならtrue', () => {
    expect(validateSlippage('1.0', '1.005', '1')).toBe(true)
  })

  test('許容範囲外ならfalse', () => {
    expect(validateSlippage('1.0', '1.02', '1')).toBe(false)
  })
})
