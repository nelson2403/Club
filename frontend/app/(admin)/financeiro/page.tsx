'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda, formatarData, cn } from '@/lib/utils'
import { Plus, X, TrendingUp, TrendingDown, DollarSign, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const selectCls = cn(inputCls, 'cursor-pointer')

function ModalLancamento({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [categoriaId, setCategoriaId] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  const { data: categorias } = useQuery({
    queryKey: ['categorias-financeiras', tipo],
    queryFn: async () => {
      const { data } = await supabase
        .from('categorias_financeiras')
        .select('id, nome')
        .eq('tipo', tipo)
        .eq('ativo', true)
        .order('nome')
      return data ?? []
    },
  })

  const { data: { user } } = useQuery({
    queryKey: ['user'],
    queryFn: async () => supabase.auth.getUser().then(r => r.data),
  }) as any

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('movimentacoes_financeiras').insert({
        descricao,
        valor: parseFloat(valor),
        tipo,
        data,
        categoria_id: categoriaId || null,
        origem: 'outro',
        usuario_id: u.user?.id,
        observacao: observacao || null,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeiro'] }); onClose() },
    onError: (e: Error) => setErro(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Novo Lançamento</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['receita', 'despesa'] as const).map(t => (
            <button key={t} onClick={() => { setTipo(t); setCategoriaId('') }}
              className={cn('py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-colors',
                tipo === t
                  ? t === 'receita' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
              {t === 'receita' ? 'Receita' : 'Despesa'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição *</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className={inputCls} placeholder="Ex: Pagamento de fornecedor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor (R$) *</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={inputCls} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className={selectCls}>
              <option value="">Sem categoria</option>
              {(categorias ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} className={inputCls} />
          </div>
        </div>

        {erro && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => mutate()} disabled={isPending || !descricao || !valor}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinanceiroPage() {
  const [modal, setModal] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['financeiro', filtroTipo, dataInicio, dataFim],
    queryFn: async () => {
      let q = supabase
        .from('movimentacoes_financeiras')
        .select(`*, categoria:categoria_id(nome), usuario:usuario_id(nome)`)
        .order('data', { ascending: false })
      if (filtroTipo !== 'todos') q = q.eq('tipo', filtroTipo)
      if (dataInicio) q = q.gte('data', dataInicio)
      if (dataFim) q = q.lte('data', dataFim)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })

  const movs = lancamentos ?? []
  const totalReceitas = movs.filter((m: any) => m.tipo === 'receita').reduce((a: number, m: any) => a + m.valor, 0)
  const totalDespesas = movs.filter((m: any) => m.tipo === 'despesa').reduce((a: number, m: any) => a + m.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const origemLabel: Record<string, string> = {
    mensalidade: 'Mensalidade', venda: 'Venda', despesa: 'Despesa', outro: 'Manual',
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {modal && <ModalLancamento onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lançamentos Financeiros</h1>
          <p className="text-sm text-slate-500">Receitas e despesas do clube</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Novo Lançamento
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Receitas</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(totalReceitas)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Despesas</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatarMoeda(totalDespesas)}</p>
        </div>
        <div className={cn('rounded-2xl border p-4', saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200')}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={cn('w-4 h-4', saldo >= 0 ? 'text-blue-600' : 'text-orange-600')} />
            <p className={cn('text-xs font-semibold uppercase tracking-wide', saldo >= 0 ? 'text-blue-600' : 'text-orange-600')}>Saldo</p>
          </div>
          <p className={cn('text-2xl font-bold', saldo >= 0 ? 'text-blue-700' : 'text-orange-700')}>{formatarMoeda(Math.abs(saldo))}</p>
          {saldo < 0 && <p className="text-xs text-orange-500 mt-0.5">negativo</p>}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todos">Todos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Origem</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : movs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum lançamento no período</td></tr>
            ) : movs.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-xs text-slate-500">{formatarData(m.data)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{m.descricao}</p>
                  {m.observacao && <p className="text-xs text-slate-400 mt-0.5">{m.observacao}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{m.categoria?.nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {origemLabel[m.origem] ?? m.origem}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={cn('font-bold text-sm', m.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500')}>
                    {m.tipo === 'receita' ? '+' : '-'} {formatarMoeda(m.valor)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
