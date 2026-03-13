'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda, cn } from '@/lib/utils'
import { ShoppingCart, ChevronDown, ChevronRight, DollarSign, CreditCard, Smartphone, TrendingUp, Search } from 'lucide-react'

const supabase = createClient()

const formaCor: Record<string, string> = {
  dinheiro: 'bg-emerald-50 text-emerald-700',
  pix: 'bg-violet-50 text-violet-700',
  cartao_debito: 'bg-blue-50 text-blue-700',
  cartao_credito: 'bg-orange-50 text-orange-700',
  transferencia: 'bg-slate-50 text-slate-600',
}

const formaLabel: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX',
  cartao_debito: 'Débito', cartao_credito: 'Crédito', transferencia: 'Transf.',
}

const statusCor: Record<string, string> = {
  finalizada: 'bg-green-50 text-green-700',
  cancelada: 'bg-red-50 text-red-600',
  aberta: 'bg-yellow-50 text-yellow-700',
}

function LinhaVenda({ venda }: { venda: any }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-1.5">
            {expandido ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <span className="text-xs font-bold text-slate-400">#{venda.numero_venda}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-600">
          {new Date(venda.data_venda).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">{venda.usuarios?.nome ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{venda.socios?.nome ?? <span className="text-slate-400 text-xs">Avulso</span>}</td>
        <td className="px-4 py-3 text-xs text-slate-400 text-center">{venda.itens_venda?.length ?? 0}</td>
        <td className="px-4 py-3">
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', formaCor[venda.forma_pagamento] ?? 'bg-slate-50 text-slate-600')}>
            {formaLabel[venda.forma_pagamento] ?? venda.forma_pagamento}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatarMoeda(venda.valor_total)}</td>
        <td className="px-4 py-3">
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusCor[venda.status] ?? 'bg-slate-50 text-slate-500')}>
            {venda.status}
          </span>
        </td>
      </tr>
      {expandido && (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-10 py-3">
            <div className="space-y-1">
              {(venda.itens_venda ?? []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                  <span>{item.produtos?.nome ?? 'Produto'}</span>
                  <span className="text-slate-400">{item.quantidade} × {formatarMoeda(item.preco_unitario)}</span>
                  <span className="font-semibold">{formatarMoeda(item.subtotal)}</span>
                </div>
              ))}
              {venda.observacao && (
                <p className="text-xs text-slate-400 mt-2 italic">{venda.observacao}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function VendasPage() {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('todas')

  const { data, isLoading } = useQuery({
    queryKey: ['vendas', dataInicio, dataFim, status],
    queryFn: async () => {
      let q = supabase.from('vendas').select(`
        id, numero_venda, data_venda, valor_total, valor_subtotal,
        forma_pagamento, status, observacao,
        usuarios(nome), socios(nome),
        itens_venda(quantidade, preco_unitario, subtotal, produtos(nome))
      `).order('data_venda', { ascending: false })

      if (dataInicio) q = q.gte('data_venda', dataInicio + 'T00:00:00')
      if (dataFim) q = q.lte('data_venda', dataFim + 'T23:59:59')
      if (status !== 'todas') q = q.eq('status', status)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })

  const vendas = data ?? []
  const finalizadas = vendas.filter((v: any) => v.status === 'finalizada')
  const totalVendas = finalizadas.reduce((a: number, v: any) => a + v.valor_total, 0)
  const ticketMedio = finalizadas.length > 0 ? totalVendas / finalizadas.length : 0

  const inputCls = 'border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Vendas do Bar</h1>
        <p className="text-sm text-slate-500">Histórico completo de vendas</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendas Finalizadas</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{finalizadas.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total do Período</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{formatarMoeda(totalVendas)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket Médio</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{formatarMoeda(ticketMedio)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">De:</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Até:</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inputCls} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
          <option value="todas">Todos os status</option>
          <option value="finalizada">Finalizadas</option>
          <option value="cancelada">Canceladas</option>
          <option value="aberta">Em aberto</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Data/Hora</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Operador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Sócio</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Itens</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Pagamento</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Total</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : vendas.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhuma venda no período</td></tr>
            ) : vendas.map((v: any) => <LinhaVenda key={v.id} venda={v} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
