'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mensalidadesApi } from '@/lib/api/mensalidades'
import { formatarData, formatarMoeda, statusCorMensalidade, cn, referenciaParaLabel } from '@/lib/utils'
import { Search, DollarSign, RefreshCw, CheckCircle, AlertTriangle, QrCode, ExternalLink, Copy, FileText, X } from 'lucide-react'
import type { FormaPagamento } from '@/types/database'

// ─── Modal de Pagamento Manual ───────────────────────────────
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

// ─── Modal de Boleto/PIX ─────────────────────────────────────
interface CobrancaGerada {
  asaas_id: string
  pix_qrcode: string | null
  pix_copia_cola: string | null
  link_pagamento: string | null
  boleto_url: string | null
  ja_existia?: boolean
}

function ModalCobranca({
  mensalidadeId, nomeSocio, onClose,
}: {
  mensalidadeId: string
  nomeSocio: string
  onClose: () => void
}) {
  const [cobranca, setCobranca] = useState<CobrancaGerada | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  async function gerarCobranca() {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/gerar-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensalidade_id: mensalidadeId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar cobrança')
      setCobranca(json)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  function copiarPix() {
    if (!cobranca?.pix_copia_cola) return
    navigator.clipboard.writeText(cobranca.pix_copia_cola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Gerar Boleto / PIX</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500">{nomeSocio}</p>

        {!cobranca && (
          <div className="space-y-3">
            {erro && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </div>
            )}
            <button
              onClick={gerarCobranca}
              disabled={carregando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {carregando ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando cobrança...</>
              ) : (
                <><QrCode className="w-4 h-4" /> Gerar PIX + Boleto</>
              )}
            </button>
          </div>
        )}

        {cobranca && (
          <div className="space-y-4">
            {cobranca.ja_existia && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Cobrança já existente — exibindo dados gerados anteriormente.
              </div>
            )}

            {/* QR Code PIX */}
            {cobranca.pix_qrcode && (
              <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">QR Code PIX</p>
                <img
                  src={`data:image/png;base64,${cobranca.pix_qrcode}`}
                  alt="QR Code PIX"
                  className="w-40 h-40"
                />
              </div>
            )}

            {/* Copia e cola */}
            {cobranca.pix_copia_cola && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">PIX Copia e Cola</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={cobranca.pix_copia_cola}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 truncate"
                  />
                  <button
                    onClick={copiarPix}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
                      copiado
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    )}
                  >
                    {copiado ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                  </button>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-2">
              {cobranca.link_pagamento && (
                <a
                  href={cobranca.link_pagamento}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Link de Pagamento
                </a>
              )}
              {cobranca.boleto_url && (
                <a
                  href={cobranca.boleto_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Boleto PDF
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full border border-gray-300 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function MensalidadesPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [modalPagamento, setModalPagamento] = useState<{ id: string; valor: number } | null>(null)
  const [modalCobranca, setModalCobranca] = useState<{ id: string; nome: string } | null>(null)

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
      {modalCobranca && (
        <ModalCobranca
          mensalidadeId={modalCobranca.id}
          nomeSocio={modalCobranca.nome}
          onClose={() => setModalCobranca(null)}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModalPagamento({ id: m.id, valor: m.valor })}
                          className="flex items-center gap-1 text-xs font-medium text-green-600
                                     hover:text-green-800 transition-colors"
                          title="Registrar pagamento manual"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Pagar
                        </button>
                        <button
                          onClick={() => setModalCobranca({ id: m.id, nome: m.socios?.nome ?? '' })}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600
                                     hover:text-blue-800 transition-colors"
                          title="Gerar boleto / PIX Asaas"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Boleto/PIX
                        </button>
                      </div>
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
