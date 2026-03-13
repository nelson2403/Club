'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'
import { produtosApi } from '@/lib/api/produtos'
import { formatarMoeda, cn } from '@/lib/utils'
import {
  Users, CreditCard, AlertTriangle, TrendingUp,
  ShoppingBag, Package, DollarSign, ArrowUpRight,
  UserCheck, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

function MetricCard({
  titulo, valor, subtitulo, icone: Icon, cor, href, tendencia,
}: {
  titulo: string
  valor: string | number
  subtitulo?: string
  icone: React.ElementType
  cor: string
  corTexto: string
  href?: string
  tendencia?: 'positivo' | 'negativo' | 'neutro'
}) {
  const conteudo = (
    <div className={cn(
      'bg-white rounded-2xl border border-slate-200 p-5 transition-all',
      href && 'hover:shadow-md hover:border-slate-300 cursor-pointer'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', cor)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {href && (
          <ArrowUpRight className="w-4 h-4 text-slate-300" />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{valor}</p>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{titulo}</p>
      {subtitulo && (
        <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>
      )}
    </div>
  )

  return href ? <Link href={href}>{conteudo}</Link> : conteudo
}

export default function DashboardPage() {
  const hoje = new Date()
  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFormatada = hoje.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const { data: metricas, isLoading } = useQuery({
    queryKey: ['dashboard', 'metricas'],
    queryFn: dashboardApi.metricas,
    refetchInterval: 60_000,
  })

  const { data: alertasEstoque } = useQuery({
    queryKey: ['estoque', 'alertas'],
    queryFn: produtosApi.alertasEstoque,
  })

  const m = metricas

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 capitalize">{diaSemana}, {dataFormatada}</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Dashboard</h1>
        </div>
        <Link
          href="/socios/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Users className="w-4 h-4" />
          Novo Sócio
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="w-10 h-10 bg-slate-100 rounded-xl mb-3" />
              <div className="h-7 bg-slate-100 rounded w-16 mb-1" />
              <div className="h-3 bg-slate-50 rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              titulo="Total de Sócios"
              valor={m?.total_socios ?? 0}
              subtitulo={`${m?.socios_ativos ?? 0} ativos`}
              icone={Users}
              cor="bg-blue-500"
              corTexto="text-blue-600"
              href="/socios"
            />
            <MetricCard
              titulo="Sócios Ativos"
              valor={m?.socios_ativos ?? 0}
              subtitulo="com plano vigente"
              icone={UserCheck}
              cor="bg-emerald-500"
              corTexto="text-emerald-600"
              href="/socios?status=ativo"
            />
            <MetricCard
              titulo="Inadimplentes"
              valor={m?.socios_inadimplentes ?? 0}
              subtitulo="com parcela vencida"
              icone={AlertCircle}
              cor="bg-red-500"
              corTexto="text-red-600"
              href="/cobrancas"
            />
            <MetricCard
              titulo="Mensalidades Abertas"
              valor={m?.mensalidades_pendentes ?? 0}
              subtitulo="pendentes + vencidas"
              icone={CreditCard}
              cor="bg-orange-500"
              corTexto="text-orange-600"
              href="/mensalidades"
            />
          </div>

          {/* Faturamento */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Faturamento do Mês</h2>
              <Link href="/relatorios" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver relatório completo
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MetricCard
                titulo="Mensalidades Recebidas"
                valor={formatarMoeda(m?.faturamento_mensalidades_mes ?? 0)}
                icone={DollarSign}
                cor="bg-emerald-500"
                corTexto="text-emerald-600"
                href="/mensalidades?status=pago"
              />
              <MetricCard
                titulo="Vendas do Bar"
                valor={formatarMoeda(m?.vendas_bar_mes ?? 0)}
                icone={ShoppingBag}
                cor="bg-violet-500"
                corTexto="text-violet-600"
                href="/vendas"
              />
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-white/20">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {formatarMoeda((m?.faturamento_mensalidades_mes ?? 0) + (m?.vendas_bar_mes ?? 0))}
                </p>
                <p className="text-xs font-medium text-blue-100 mt-0.5">Receita Total do Mês</p>
              </div>
            </div>
          </div>

          {/* Linha inferior: alertas + estoque baixo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Inadimplentes recentes */}
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Inadimplentes</h3>
                </div>
                <Link href="/cobrancas"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Ver todos
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {(m?.socios_inadimplentes ?? 0) === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  Nenhum inadimplente no momento
                </div>
              ) : (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-red-600">{m?.socios_inadimplentes}</p>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">sócios em débito</p>
                      <Link href="/cobrancas"
                        className="text-xs font-semibold text-red-600 hover:text-red-800 mt-1 inline-block">
                        Gerenciar cobranças →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estoque baixo */}
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Estoque Baixo</h3>
                </div>
                <Link href="/estoque?filtro=baixo"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Ver todos
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {!alertasEstoque || alertasEstoque.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  Estoque em dia
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {alertasEstoque.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                        <p className="text-xs text-slate-400">{item.categoria}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600
                                         text-xs font-semibold px-2 py-1 rounded-full">
                          {item.quantidade_atual} unid.
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">mín: {item.estoque_minimo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
