'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarData, cn } from '@/lib/utils'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

const tipoCor: Record<string, string> = {
  entrada: 'bg-emerald-50 text-emerald-700',
  saida: 'bg-red-50 text-red-600',
  ajuste: 'bg-blue-50 text-blue-700',
}

const tipoLabel: Record<string, string> = {
  entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste',
}

export default function MovimentacoesEstoquePage() {
  const [tipo, setTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  const { data: movimentacoes, isLoading } = useQuery({
    queryKey: ['movimentacoes-estoque', tipo, busca, dataInicio, dataFim],
    queryFn: async () => {
      let q = supabase
        .from('movimentacoes_estoque')
        .select(`*, produto:produto_id(nome, unidade_medida), usuario:usuario_id(nome)`)
        .order('data', { ascending: false })
        .limit(100)

      if (tipo !== 'todos') q = q.eq('tipo', tipo)
      if (dataInicio) q = q.gte('data', dataInicio + 'T00:00:00')
      if (dataFim) q = q.lte('data', dataFim + 'T23:59:59')

      const { data, error } = await q
      if (error) throw error

      let result = data ?? []
      if (busca) result = result.filter((m: any) =>
        m.produto?.nome?.toLowerCase().includes(busca.toLowerCase())
      )
      return result
    },
  })

  const movs = movimentacoes ?? []
  const totalEntradas = movs.filter((m: any) => m.tipo === 'entrada').length
  const totalSaidas = movs.filter((m: any) => m.tipo === 'saida').length
  const totalAjustes = movs.filter((m: any) => m.tipo === 'ajuste').length

  const inputCls = 'border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/estoque" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Movimentações de Estoque</h1>
          <p className="text-sm text-slate-500">Histórico de entradas, saídas e ajustes</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <ArrowUpCircle className="w-8 h-8 text-emerald-500" />
          <div>
            <p className="text-2xl font-bold text-emerald-700">{totalEntradas}</p>
            <p className="text-xs text-emerald-600">Entradas</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <ArrowDownCircle className="w-8 h-8 text-red-400" />
          <div>
            <p className="text-2xl font-bold text-red-600">{totalSaidas}</p>
            <p className="text-xs text-red-500">Saídas</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-400" />
          <div>
            <p className="text-2xl font-bold text-blue-700">{totalAjustes}</p>
            <p className="text-xs text-blue-600">Ajustes</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className={inputCls} />
        <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
          <option value="todos">Todos os tipos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
          <option value="ajuste">Ajustes</option>
        </select>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputCls} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inputCls} />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qtd</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Saldo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Referência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : movs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma movimentação encontrada</td></tr>
            ) : movs.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-xs text-slate-500">
                  {new Date(m.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{m.produto?.nome ?? '—'}</p>
                  <p className="text-xs text-slate-400">{m.produto?.unidade_medida}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', tipoCor[m.tipo] ?? 'bg-slate-50 text-slate-600')}>
                    {tipoLabel[m.tipo] ?? m.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{m.quantidade}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">
                  {m.saldo_antes} → <span className="font-semibold text-slate-800">{m.saldo_depois}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{m.usuario?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{m.referencia ?? m.observacao ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
