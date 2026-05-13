'use client'

import { useState } from 'react'
import { calcBuy, calcSell } from '@/lib/amm'

interface Stock {
  id: string
  ticker: string
  name: string
  stock_pool: number
  mpoint_pool: number
}

export default function OrderPanel({ stock }: { stock: Stock }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')

  const state = {
    stockPool: stock.stock_pool.toString(),
    mpointPool: stock.mpoint_pool.toString(),
  }

  let preview = null
  if (amount && parseFloat(amount) > 0) {
    try {
      if (side === 'buy') {
        const result = calcBuy(state, amount)
        preview = {
          label: '取得予定株数',
          value: parseFloat(result.stockOut).toFixed(4) + ' 株',
          price: parseFloat(result.avgPrice).toFixed(4) + ' Mpt/株',
          impact: result.priceImpact,
        }
      } else {
        const result = calcSell(state, amount)
        preview = {
          label: '受取予定Mpt',
          value: parseFloat(result.mpointOut).toFixed(4) + ' Mpt',
          price: parseFloat(result.avgPrice).toFixed(4) + ' Mpt/株',
          impact: result.priceImpact,
        }
      }
    } catch {}
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-6 py-5">
      <div className="text-xs text-gray-500 tracking-widest mb-4">ORDER</div>

      {/* BUY / SELL タブ */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${
            side === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-500 hover:text-white'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${
            side === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-500 hover:text-white'
          }`}
        >
          SELL
        </button>
      </div>

      {/* 金額入力 */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">
          {side === 'buy' ? '支払うMpt' : '売る株数'}
        </label>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* プレビュー */}
      {preview && (
        <div className="bg-gray-800 rounded p-3 mb-4 flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{preview.label}</span>
            <span className="text-white font-mono">{preview.value}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">約定価格</span>
            <span className="text-white font-mono">{preview.price}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">価格影響</span>
            <span className={parseFloat(preview.impact) > 3 ? 'text-yellow-400 font-mono' : 'text-gray-400 font-mono'}>
              {parseFloat(preview.impact).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* 注文ボタン */}
      <button
        disabled={!amount || parseFloat(amount) <= 0}
        className={`w-full py-3 rounded text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          side === 'buy'
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-red-600 hover:bg-red-500 text-white'
        }`}
      >
        {side === 'buy' ? 'BUY（Phase 3で実装）' : 'SELL（Phase 3で実装）'}
      </button>
    </div>
  )
}
