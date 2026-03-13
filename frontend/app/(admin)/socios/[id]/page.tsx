'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  formatarData, formatarMoeda, formatarCPF, formatarTelefone,
  statusCorMensalidade, statusCorSocio, cn, referenciaParaLabel, formaPagamentoLabel
} from '@/lib/utils'
import {
  ArrowLeft, Edit2, Phone, Mail, MapPin, Calendar,
  CreditCard, CheckCircle, AlertTriangle, Clock,
  DollarSign, ShoppingBag, User, BadgeCheck, Send, Copy, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import type { FormaPagamento, StatusMensalidade } from '@/types/database'
import { mensalidadesApi } from '@/lib/api/mensalidades'

const supabase = createClient()

// ============================================================
// Modal de pagamento inline
// ============================================================
function ModalPagamento({
  mensalidadeId, valor, referencia, onClose,
}: {
  mensalidadeId: string
  valor: number
  referencia: number
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [valorPago, setValorPago] = useState(valor.toFixed(2))

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      mensalidadesApi.registrarPagamento(mensalidadeId, forma, parseFloat(valorPago)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socio'] })
      qc.invalidateQueries({ queryKey: ['mensalidades'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900">Registrar Pagamento</h3>
        <p className="text-sm text-gray-500">{referenciaParaLabel(referencia)}</p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value as FormaPagamento)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_debito">Cartão Débito</option>
            <option value="cartao_credito">Cartão Crédito</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor Pago</label>
          <input
            type="number" step="0.01" value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => mutate()} disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
            {isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Badge de status da mensalidade
// ============================================================
function StatusBadge({ status }: { status: StatusMensalidade }) {
  const icones: Record<StatusMensalidade, React.ReactNode> = {
    pago: <CheckCircle className="w-3.5 h-3.5" />,
    pendente: <Clock className="w-3.5 h-3.5" />,
    vencido: <AlertTriangle className="w-3.5 h-3.5" />,
    cancelado: <span className="w-3.5 h-3.5 inline-block" />,
  }
  const labels: Record<StatusMensalidade, string> = {
    pago: 'Pago', pendente: 'Pendente', vencido: 'Vencido', cancelado: 'Cancelado',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', statusCorMensalidade(status))}>
      {icones[status]}
      {labels[status]}
    </span>
  )
}

// ============================================================
// Página principal
// ============================================================
export default function SocioPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [filtroParcelas, setFiltroParcelas] = useState<string>('todas')
  const [modalPagamento, setModalPagamento] = useState<{ id: string; valor: number; referencia: number } | null>(null)
  const [enviandoLink, setEnviandoLink] = useState(false)
  const [linkEnviado, setLinkEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  async function enviarLinkPortal() {
    setEnviandoLink(true)
    setErroEnvio('')
    try {
      const res = await fetch('/api/portal/enviar-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socio_id: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLinkEnviado(true)
      setTimeout(() => setLinkEnviado(false), 4000)
    } catch (e: any) {
      setErroEnvio(e.message)
      setTimeout(() => setErroEnvio(''), 5000)
    } finally {
      setEnviandoLink(false)
    }
  }

  function copiarLinkPortal() {
    if (!socio?.token_portal) return
    const url = `${window.location.origin}/portal/${socio.token_portal}`
    const el = document.createElement('textarea')
    el.value = url
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    alert(`Link copiado!\n\n${url}`)
  }

  const { data: socio, isLoading } = useQuery({
    queryKey: ['socio', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('socios')
        .select(`
          *,
          socios_planos(
            id, status, data_inicio, data_fim,
            planos(id, nome_plano, valor_mensalidade, dia_vencimento)
          ),
          mensalidades(
            id, valor, valor_pago, data_vencimento, data_pagamento,
            status, forma_pagamento, referencia_mes, observacao, desconto, multa, juros
          )
        `)
        .eq('id', id)
        .order('data_vencimento', { referencedTable: 'mensalidades', ascending: false })
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: compras } = useQuery({
    queryKey: ['socio', id, 'compras'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('id, numero_venda, data_venda, valor_total, forma_pagamento, status')
        .eq('socio_id', id)
        .eq('status', 'finalizada')
        .order('data_venda', { ascending: false })
        .limit(10)
      return data ?? []
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!socio) return <div className="text-gray-500">Sócio não encontrado.</div>

  const planoAtivo = (socio.socios_planos as any[])?.find((p) => p.status === 'ativo')
  const mensalidades: any[] = socio.mensalidades ?? []

  const mensalidadesFiltradas = mensalidades.filter((m) =>
    filtroParcelas === 'todas' ? true : m.status === filtroParcelas
  )

  // Totais
  const totalDevido = mensalidades
    .filter((m) => m.status !== 'pago' && m.status !== 'cancelado')
    .reduce((acc, m) => acc + m.valor, 0)
  const totalPago = mensalidades
    .filter((m) => m.status === 'pago')
    .reduce((acc, m) => acc + (m.valor_pago ?? m.valor), 0)
  const totalVencido = mensalidades
    .filter((m) => m.status === 'vencido')
    .reduce((acc, m) => acc + m.valor, 0)

  const contadores = {
    todas: mensalidades.length,
    pago: mensalidades.filter((m) => m.status === 'pago').length,
    pendente: mensalidades.filter((m) => m.status === 'pendente').length,
    vencido: mensalidades.filter((m) => m.status === 'vencido').length,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {modalPagamento && (
        <ModalPagamento
          mensalidadeId={modalPagamento.id}
          valor={modalPagamento.valor}
          referencia={modalPagamento.referencia}
          onClose={() => setModalPagamento(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/socios"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{socio.nome}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusCorSocio(socio.status))}>
                {socio.status}
              </span>
              {planoAtivo && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                  {planoAtivo.planos?.nome_plano}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botões do portal */}
          <button
            onClick={copiarLinkPortal}
            title="Copiar link do portal"
            className="flex items-center gap-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copiar link
          </button>
          <button
            onClick={enviarLinkPortal}
            disabled={enviandoLink}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors',
              linkEnviado
                ? 'bg-green-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60'
            )}
          >
            {linkEnviado ? (
              <><CheckCircle className="w-4 h-4" /> Enviado!</>
            ) : enviandoLink ? (
              <><Send className="w-4 h-4 animate-pulse" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar portal</>
            )}
          </button>
          {erroEnvio && (
            <span className="text-xs text-red-500 max-w-[180px] truncate" title={erroEnvio}>
              {erroEnvio}
            </span>
          )}
          <Link href={`/socios/${id}/editar`}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50
                       text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Coluna esquerda: dados do sócio */}
        <div className="space-y-4">

          {/* Dados pessoais */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Dados Pessoais
            </h2>
            <div className="space-y-2 text-sm">
              {socio.cpf && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400 text-xs w-16">CPF</span>
                  <span>{formatarCPF(socio.cpf)}</span>
                </div>
              )}
              {socio.data_nascimento && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{formatarData(socio.data_nascimento)}</span>
                </div>
              )}
              {socio.telefone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{formatarTelefone(socio.telefone)}</span>
                </div>
              )}
              {socio.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{socio.email}</span>
                </div>
              )}
              {(socio.endereco || socio.cidade) && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">
                    {[socio.endereco, socio.numero, socio.bairro, socio.cidade, socio.estado]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            {socio.observacoes && (
              <div className="pt-2 border-t border-gray-50 text-xs text-gray-500">
                {socio.observacoes}
              </div>
            )}
          </div>

          {/* Plano atual */}
          {planoAtivo && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Plano Ativo</p>
              <p className="font-bold text-blue-900">{planoAtivo.planos?.nome_plano}</p>
              <p className="text-xl font-bold text-blue-700 mt-1">
                {formatarMoeda(planoAtivo.planos?.valor_mensalidade)}
                <span className="text-sm font-normal text-blue-500">/mês</span>
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Vencimento todo dia {planoAtivo.planos?.dia_vencimento}
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Desde {formatarData(planoAtivo.data_inicio)}
              </p>
            </div>
          )}

          {/* Resumo financeiro */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Resumo Financeiro</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Total pago</span>
                <span className="font-semibold text-green-600">{formatarMoeda(totalPago)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Em aberto</span>
                <span className="font-semibold text-yellow-600">{formatarMoeda(totalDevido - totalVencido)}</span>
              </div>
              {totalVencido > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    Vencido
                  </span>
                  <span className="font-bold text-red-600">{formatarMoeda(totalVencido)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Consumo no bar */}
          {compras && compras.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-gray-400" />
                Últimas Compras no Bar
              </h2>
              <div className="space-y-2">
                {compras.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{formatarData(c.data_venda)}</span>
                    <span className="font-medium text-gray-800">{formatarMoeda(c.valor_total)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">
                Total gasto: {formatarMoeda(compras.reduce((a: number, c: any) => a + c.valor_total, 0))}
              </p>
            </div>
          )}
        </div>

        {/* Coluna direita: mensalidades */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                Mensalidades ({mensalidades.length})
              </h2>
            </div>

            {/* Filtros de status */}
            <div className="px-5 py-3 border-b border-gray-50 flex gap-2 overflow-x-auto">
              {([
                { value: 'todas', label: 'Todas' },
                { value: 'vencido', label: 'Vencidas' },
                { value: 'pendente', label: 'Pendentes' },
                { value: 'pago', label: 'Pagas' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFiltroParcelas(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    filtroParcelas === value
                      ? value === 'vencido'
                        ? 'bg-red-600 text-white'
                        : value === 'pendente'
                        ? 'bg-yellow-500 text-white'
                        : value === 'pago'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    filtroParcelas === value ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                  )}>
                    {contadores[value as keyof typeof contadores]}
                  </span>
                </button>
              ))}
            </div>

            {/* Lista de mensalidades */}
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {mensalidadesFiltradas.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Nenhuma mensalidade encontrada
                </div>
              ) : (
                mensalidadesFiltradas.map((m: any) => (
                  <div key={m.id} className={cn(
                    'flex items-center gap-4 px-5 py-4',
                    m.status === 'vencido' && 'bg-red-50/30'
                  )}>
                    {/* Indicador visual */}
                    <div className={cn(
                      'w-1.5 h-10 rounded-full flex-shrink-0',
                      m.status === 'pago' ? 'bg-green-500'
                      : m.status === 'vencido' ? 'bg-red-500'
                      : m.status === 'pendente' ? 'bg-yellow-400'
                      : 'bg-gray-200'
                    )} />

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {referenciaParaLabel(m.referencia_mes)}
                        </p>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">
                          Vence: {formatarData(m.data_vencimento)}
                        </span>
                        {m.data_pagamento && (
                          <span className="text-xs text-green-600">
                            Pago em: {formatarData(m.data_pagamento)}
                          </span>
                        )}
                      </div>
                      {m.data_pagamento && m.forma_pagamento && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          via {formaPagamentoLabel(m.forma_pagamento)}
                        </p>
                      )}
                      {(m.desconto > 0 || m.multa > 0 || m.juros > 0) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.desconto > 0 && `Desconto: ${formatarMoeda(m.desconto)} `}
                          {m.multa > 0 && `Multa: ${formatarMoeda(m.multa)} `}
                          {m.juros > 0 && `Juros: ${formatarMoeda(m.juros)}`}
                        </p>
                      )}
                    </div>

                    {/* Valor */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-gray-900">
                        {formatarMoeda(m.status === 'pago' ? (m.valor_pago ?? m.valor) : m.valor)}
                      </p>
                      {m.status === 'pago' && m.valor_pago && m.valor_pago !== m.valor && (
                        <p className="text-xs text-gray-400 line-through">{formatarMoeda(m.valor)}</p>
                      )}
                    </div>

                    {/* Ação */}
                    <div className="flex-shrink-0 w-20 text-right">
                      {(m.status === 'pendente' || m.status === 'vencido') && (
                        <button
                          onClick={() => setModalPagamento({ id: m.id, valor: m.valor, referencia: m.referencia_mes })}
                          className="flex items-center gap-1 text-xs font-semibold text-green-600
                                     hover:text-green-800 transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Pagar
                        </button>
                      )}
                      {m.status === 'pago' && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
