'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { mensalidadesApi } from '@/lib/api/mensalidades'
import {
  formatarMoeda, formatarData, formatarTelefone, cn
} from '@/lib/utils'
import {
  AlertTriangle, MessageCircle, Mail, Phone,
  CheckCircle, RefreshCw, ChevronDown, ChevronRight, DollarSign
} from 'lucide-react'
import Link from 'next/link'
import type { FormaPagamento } from '@/types/database'

const supabase = createClient()

// ============================================================
// Modal de pagamento
// ============================================================
function ModalPagamento({
  mensalidadeId, valor, nomeSocio, onClose,
}: {
  mensalidadeId: string
  valor: number
  nomeSocio: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [valorPago, setValorPago] = useState(valor.toFixed(2))

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      mensalidadesApi.registrarPagamento(mensalidadeId, forma, parseFloat(valorPago)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inadimplentes'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900">Registrar Pagamento</h3>
        <p className="text-sm text-gray-500">{nomeSocio} — {formatarMoeda(valor)}</p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
          <select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_debito">Cartão Débito</option>
            <option value="cartao_credito">Cartão Crédito</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor Pago</label>
          <input type="number" step="0.01" value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-3">
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
// Card expandível por sócio
// ============================================================
function CardInadimplente({
  inadimplente, onPagar, onRegistrarCobranca,
}: {
  inadimplente: any
  onPagar: (id: string, valor: number, nome: string) => void
  onRegistrarCobranca: (mensalidadeId: string, tipo: 'manual' | 'whatsapp' | 'email') => void
}) {
  const [expandido, setExpandido] = useState(false)

  const { data: parcelas } = useQuery({
    queryKey: ['cobranca-parcelas', inadimplente.socio_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mensalidades')
        .select('id, valor, data_vencimento, status, referencia_mes')
        .eq('socio_id', inadimplente.socio_id)
        .in('status', ['pendente', 'vencido'])
        .order('data_vencimento', { ascending: true })
      return data ?? []
    },
    enabled: expandido,
  })

  const grauInadimplencia = inadimplente.dias_inadimplente > 60 ? 'critico'
    : inadimplente.dias_inadimplente > 30 ? 'alto' : 'medio'

  return (
    <div className={cn(
      'bg-white rounded-xl border overflow-hidden transition-all',
      grauInadimplencia === 'critico' ? 'border-red-200' : 'border-gray-200'
    )}>
      {/* Header do card */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        {/* Indicador de gravidade */}
        <div className={cn(
          'w-2 h-12 rounded-full flex-shrink-0',
          grauInadimplencia === 'critico' ? 'bg-red-500'
          : grauInadimplencia === 'alto' ? 'bg-orange-400'
          : 'bg-yellow-400'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/socios/${inadimplente.socio_id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {inadimplente.nome}
            </Link>
            {grauInadimplencia === 'critico' && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                Crítico
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400">
            {inadimplente.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {formatarTelefone(inadimplente.telefone)}
              </span>
            )}
            {inadimplente.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {inadimplente.email}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-red-600">
            {formatarMoeda(inadimplente.valor_total_devido)}
          </p>
          <p className="text-xs text-gray-400">
            {inadimplente.total_mensalidades_abertas} parcela(s) •
            {inadimplente.dias_inadimplente}d atraso
          </p>
        </div>

        {/* Ações rápidas */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {inadimplente.telefone && (
            <a
              href={`https://wa.me/55${inadimplente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Olá ${inadimplente.nome.split(' ')[0]}! Identificamos mensalidade(s) em aberto no valor de ${formatarMoeda(inadimplente.valor_total_devido)}. Entre em contato para regularizar. 😊`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800
                         border border-green-200 hover:border-green-400 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Enviar WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
          {expandido
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </div>
      </div>

      {/* Parcelas expandidas */}
      {expandido && (
        <div className="border-t border-gray-100 bg-gray-50">
          {!parcelas ? (
            <div className="px-5 py-4 text-sm text-gray-400">Carregando parcelas...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {parcelas.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {p.referencia_mes.toString().slice(0, 4)}/{p.referencia_mes.toString().slice(4)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Vence: {formatarData(p.data_vencimento)}
                      {p.status === 'vencido' && (
                        <span className="ml-2 text-red-500 font-medium">Vencida</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatarMoeda(p.valor)}</span>
                    <button
                      onClick={() => onPagar(p.id, p.valor, inadimplente.nome)}
                      className="flex items-center gap-1 text-xs font-medium text-green-600
                                 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Receber
                    </button>
                    <button
                      onClick={() => onRegistrarCobranca(p.id, 'manual')}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100"
                    >
                      Cobrado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Página principal
// ============================================================
export default function CobrancasPage() {
  const qc = useQueryClient()
  const [modalPagamento, setModalPagamento] = useState<{
    id: string; valor: number; nome: string
  } | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  const { data: inadimplentes, isLoading } = useQuery({
    queryKey: ['inadimplentes'],
    queryFn: mensalidadesApi.inadimplentes,
  })

  const { mutate: registrarCobranca } = useMutation({
    mutationFn: ({ mensalidadeId, tipo }: { mensalidadeId: string; tipo: 'manual' | 'whatsapp' | 'email' }) =>
      mensalidadesApi.registrarCobranca(mensalidadeId, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inadimplentes'] }),
  })

  async function handleAtualizarVencidas() {
    setAtualizando(true)
    await mensalidadesApi.marcarVencidas()
    qc.invalidateQueries({ queryKey: ['inadimplentes'] })
    setAtualizando(false)
  }

  const totalDevido = inadimplentes?.reduce((acc, i) => acc + i.valor_total_devido, 0) ?? 0
  const totalSocios = inadimplentes?.length ?? 0

  return (
    <div className="space-y-5">
      {modalPagamento && (
        <ModalPagamento
          mensalidadeId={modalPagamento.id}
          valor={modalPagamento.valor}
          nomeSocio={modalPagamento.nome}
          onClose={() => setModalPagamento(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Controle de Cobranças</h1>
          <p className="text-sm text-gray-500">Sócios com mensalidades em atraso</p>
        </div>
        <button
          onClick={handleAtualizarVencidas}
          disabled={atualizando}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn('w-4 h-4', atualizando && 'animate-spin')} />
          Atualizar Vencidas
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sócios Inadimplentes</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalSocios}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total em Débito</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatarMoeda(totalDevido)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Críticos (+60 dias)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {inadimplentes?.filter((i) => i.dias_inadimplente > 60).length ?? 0}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400">Carregando...</div>
        ) : (inadimplentes ?? []).length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-green-800">Sem inadimplentes!</p>
            <p className="text-sm text-green-600 mt-1">Todos os sócios estão em dia.</p>
          </div>
        ) : (
          inadimplentes!.map((i) => (
            <CardInadimplente
              key={i.socio_id}
              inadimplente={i}
              onPagar={(id, valor, nome) => setModalPagamento({ id, valor, nome })}
              onRegistrarCobranca={(mensalidadeId, tipo) =>
                registrarCobranca({ mensalidadeId, tipo })
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
