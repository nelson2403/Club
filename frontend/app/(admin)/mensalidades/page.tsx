'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mensalidadesApi } from '@/lib/api/mensalidades'
import { formatarData, formatarMoeda, statusCorMensalidade, cn, referenciaParaLabel } from '@/lib/utils'
import { Search, DollarSign, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import type { FormaPagamento } from '@/types/database'

function ModalPagamento({
  mensalidadeId, valor, onClose,
}: {
  mensalidadeId: string
  valor: number
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [valorPago, setValorPago] = useState(valor.toFixed(2))
  const [obs, setObs] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      mensalidadesApi.registrarPagamento(mensalidadeId, forma, parseFloat(valorPago), obs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mensalidades'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Registrar Pagamento</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pago</label>
          <input
            type="number"
            step="0.01"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
          <input
            type="text"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Opcional"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isPending ? 'Registrando...' : 'Confirmar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MensalidadesPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [modalPagamento, setModalPagamento] = useState<{ id: string; valor: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['mensalidades', 'list', { status, page }],
    queryFn: () => mensalidadesApi.listar({ status: status || undefined, page }),
  })

  const { mutate: gerarMensalidades, isPending: gerando } = useMutation({
    mutationFn: () => {
      const agora = new Date()
      return mensalidadesApi.gerarMensalidades(agora.getFullYear(), agora.getMonth() + 1)
    },
    onSuccess: (resultado: any) => {
      qc.invalidateQueries({ queryKey: ['mensalidades'] })
      alert(`Mensalidades geradas: ${resultado?.geradas ?? 0}`)
    },
  })

  const mensalidades = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-5">
      {modalPagamento && (
        <ModalPagamento
          mensalidadeId={modalPagamento.id}
          valor={modalPagamento.valor}
          onClose={() => setModalPagamento(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mensalidades</h1>
          <p className="text-sm text-gray-500">{total} registros encontrados</p>
        </div>
        <button
          onClick={() => gerarMensalidades()}
          disabled={gerando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn('w-4 h-4', gerando && 'animate-spin')} />
          Gerar Mensalidades do Mês
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar sócio..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="vencido">Vencido</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Sócio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plano</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Referência</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pagamento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">Carregando...</td>
              </tr>
            ) : mensalidades.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">Nenhum registro encontrado</td>
              </tr>
            ) : (
              mensalidades.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {m.socios?.nome ?? '-'}
                    {m.status === 'vencido' && (
                      <AlertTriangle className="inline w-3.5 h-3.5 text-red-500 ml-1.5" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.planos?.nome_plano ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{referenciaParaLabel(m.referencia_mes)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatarData(m.data_vencimento)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatarMoeda(m.valor)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusCorMensalidade(m.status))}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {m.data_pagamento ? formatarData(m.data_pagamento) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {m.status !== 'pago' && m.status !== 'cancelado' && (
                      <button
                        onClick={() => setModalPagamento({ id: m.id, valor: m.valor })}
                        className="flex items-center gap-1.5 text-xs font-medium text-green-600
                                   hover:text-green-800 transition-colors"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Pagar
                      </button>
                    )}
                    {m.status === 'pago' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
