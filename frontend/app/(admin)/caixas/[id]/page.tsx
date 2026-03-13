'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda, cn } from '@/lib/utils'
import {
  ArrowLeft, Wallet, User, Clock, CheckCircle,
  ShoppingCart, DollarSign, CreditCard, Smartphone,
  TrendingUp, Package, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

const formaPagamentoConfig: Record<string, { label: string; cor: string; icon: React.ElementType }> = {
  dinheiro:       { label: 'Dinheiro',       cor: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: DollarSign },
  pix:            { label: 'PIX',            cor: 'bg-violet-50 text-violet-700 border-violet-200',   icon: Smartphone },
  cartao_debito:  { label: 'Débito',         cor: 'bg-blue-50 text-blue-700 border-blue-200',         icon: CreditCard },
  cartao_credito: { label: 'Crédito',        cor: 'bg-orange-50 text-orange-700 border-orange-200',  icon: CreditCard },
  transferencia:  { label: 'Transferência',  cor: 'bg-gray-50 text-gray-700 border-gray-200',        icon: TrendingUp },
}

export default function CaixaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: caixa, isLoading: loadingCaixa } = useQuery({
    queryKey: ['caixa', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixas')
        .select(`*, operador:usuario_abertura(nome, email), fechador:usuario_fechamento(nome)`)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: vendas } = useQuery({
    queryKey: ['caixa', id, 'vendas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          id, numero_venda, data_venda, valor_total, forma_pagamento,
          status, observacao,
          socio:socio_id(nome),
          operador:usuario_id(nome),
          itens_venda(
            quantidade, preco_unitario, subtotal,
            produto:produto_id(nome, codigo_barras)
          )
        `)
        .eq('caixa_id', id)
        .order('data_venda', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!id,
  })

  const { data: movimentacoes } = useQuery({
    queryKey: ['caixa', id, 'mov'],
    queryFn: async () => {
      const { data } = await supabase
        .from('movimentacoes_caixa')
        .select(`*, usuario:usuario_id(nome)`)
        .eq('caixa_id', id)
        .order('data', { ascending: true })
      return data ?? []
    },
    enabled: !!id,
  })

  const vendasFinalizadas = (vendas ?? []).filter((v: any) => v.status === 'finalizada')

  // Totais por forma de pagamento
  const totaisPorForma = vendasFinalizadas.reduce((acc: Record<string, number>, v: any) => {
    acc[v.forma_pagamento] = (acc[v.forma_pagamento] ?? 0) + v.valor_total
    return acc
  }, {})

  const totalVendas = vendasFinalizadas.reduce((a: number, v: any) => a + v.valor_total, 0)

  function formatarDT(dt: string) {
    return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loadingCaixa) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/caixas" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Detalhes do Caixa</h1>
          <p className="text-sm text-slate-500">
            {caixa?.data_abertura ? new Date(caixa.data_abertura).toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
            }) : ''}
          </p>
        </div>
        <span className={cn(
          'ml-auto px-3 py-1 rounded-full text-xs font-semibold',
          caixa?.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
        )}>
          {caixa?.status === 'aberto' ? 'Aberto' : 'Fechado'}
        </span>
      </div>

      {/* Info do caixa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operador</p>
          </div>
          <p className="font-bold text-slate-900">{caixa?.operador?.nome ?? '—'}</p>
          <p className="text-xs text-slate-400">{caixa?.operador?.email ?? ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Abertura</p>
          </div>
          <p className="font-bold text-slate-900">{caixa?.data_abertura ? formatarDT(caixa.data_abertura) : '—'}</p>
          <p className="text-xs text-slate-400">Fundo: {formatarMoeda(caixa?.valor_inicial ?? 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fechamento</p>
          </div>
          <p className="font-bold text-slate-900">{caixa?.data_fechamento ? formatarDT(caixa.data_fechamento) : '—'}</p>
          {caixa?.usuario_fechamento && (
            <p className="text-xs text-slate-400">por {caixa.fechador?.nome}</p>
          )}
        </div>
        <div className={cn(
          'rounded-2xl border p-4',
          caixa?.diferenca == null ? 'bg-white border-slate-200'
          : caixa.diferenca === 0 ? 'bg-green-50 border-green-200'
          : caixa.diferenca > 0 ? 'bg-blue-50 border-blue-200'
          : 'bg-red-50 border-red-200'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diferença</p>
          </div>
          {caixa?.diferenca == null ? (
            <p className="font-bold text-slate-400">Caixa aberto</p>
          ) : (
            <>
              <p className={cn('font-bold text-xl', caixa.diferenca === 0 ? 'text-green-700' : caixa.diferenca > 0 ? 'text-blue-700' : 'text-red-700')}>
                {caixa.diferenca > 0 ? '+' : ''}{formatarMoeda(caixa.diferenca)}
              </p>
              <p className="text-xs text-slate-400">
                Contagem: {formatarMoeda(caixa.valor_final ?? 0)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Resumo por forma de pagamento */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Resumo por Pagamento</h2>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(totaisPorForma).map(([forma, total]) => {
              const cfg = formaPagamentoConfig[forma] ?? { label: forma, cor: 'bg-gray-50 text-gray-700 border-gray-200', icon: DollarSign }
              const Icon = cfg.icon
              return (
                <div key={forma} className={cn('flex items-center justify-between p-3 rounded-xl border', cfg.cor)}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </div>
                  <span className="font-bold">{formatarMoeda(total as number)}</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 text-white mt-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">Total</span>
              </div>
              <span className="font-bold text-lg">{formatarMoeda(totalVendas)}</span>
            </div>
            <p className="text-xs text-slate-400 text-center">
              {vendasFinalizadas.length} venda(s) finalizada(s)
            </p>
          </div>
        </div>

        {/* Lista de vendas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-slate-400" />
              Vendas do Período ({(vendas ?? []).length})
            </h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {(vendas ?? []).length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Nenhuma venda neste caixa</div>
            ) : (vendas ?? []).map((v: any) => {
              const cfg = formaPagamentoConfig[v.forma_pagamento] ?? { label: v.forma_pagamento, cor: 'bg-gray-50 text-gray-600', icon: DollarSign }
              const Icon = cfg.icon
              return (
                <div key={v.id} className={cn('px-5 py-3', v.status === 'cancelada' && 'opacity-50')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{v.numero_venda}</span>
                      <span className="text-sm font-medium text-slate-800">
                        {v.socio?.nome ?? 'Venda avulsa'}
                      </span>
                      {v.status === 'cancelada' && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelada</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', cfg.cor)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="font-bold text-slate-900">{formatarMoeda(v.valor_total)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-slate-400">{formatarDT(v.data_venda)}</p>
                    <p className="text-xs text-slate-400">
                      {v.itens_venda?.length ?? 0} item(s):{' '}
                      {v.itens_venda?.map((it: any) => it.produto?.nome).filter(Boolean).join(', ')}
                    </p>
                  </div>
                  {v.observacao && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{v.observacao}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
