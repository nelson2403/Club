'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Clock, AlertCircle, Copy, ExternalLink, QrCode, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

// Cliente público com anon key — somente leitura via service role na API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function refMesLabel(ref: number) {
  const s = String(ref)
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${meses[parseInt(s.substring(4, 6)) - 1]} ${s.substring(0, 4)}`
}

type StatusMensalidade = 'pendente' | 'pago' | 'vencido' | 'cancelado'

interface Mensalidade {
  id: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  referencia_mes: number
  status: StatusMensalidade
  forma_pagamento: string | null
  asaas_id: string | null
  pix_qrcode: string | null
  pix_copia_cola: string | null
  link_pagamento: string | null
}

interface Socio {
  id: string
  nome: string
  email: string | null
  status: string
  token_portal: string
}

function BadgeStatus({ status }: { status: StatusMensalidade }) {
  const map: Record<StatusMensalidade, { label: string; cls: string; icon: React.ReactNode }> = {
    pago: { label: 'Pago', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    pendente: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
    vencido: { label: 'Vencido', cls: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  }
  const { label, cls, icon } = map[status] ?? map.pendente
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {icon} {label}
    </span>
  )
}

function CartaoPagamento({ mensalidade, token, onPago }: {
  mensalidade: Mensalidade
  token: string
  onPago: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [dadosPix, setDadosPix] = useState<{
    pix_qrcode: string
    pix_copia_cola: string
    link_pagamento: string
  } | null>(mensalidade.pix_copia_cola ? {
    pix_qrcode: mensalidade.pix_qrcode!,
    pix_copia_cola: mensalidade.pix_copia_cola,
    link_pagamento: mensalidade.link_pagamento!,
  } : null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  const gerarCobranca = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/portal/gerar-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensalidade_id: mensalidade.id, token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDadosPix(data)
      setExpandido(true)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [mensalidade.id, token])

  const copiarPix = () => {
    if (!dadosPix?.pix_copia_cola) return
    navigator.clipboard.writeText(dadosPix.pix_copia_cola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const isPendente = mensalidade.status === 'pendente' || mensalidade.status === 'vencido'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-slate-900">{refMesLabel(mensalidade.referencia_mes)}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            Venc. {formatarData(mensalidade.data_vencimento)}
            {mensalidade.data_pagamento && ` · Pago em ${formatarData(mensalidade.data_pagamento.split('T')[0])}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-slate-800">{formatarMoeda(mensalidade.valor)}</p>
          <BadgeStatus status={mensalidade.status} />
        </div>
      </div>

      {/* Ações para mensalidades pendentes/vencidas */}
      {isPendente && (
        <div className="px-5 pb-4 border-t border-slate-50 pt-3">
          {!dadosPix ? (
            <button
              onClick={gerarCobranca}
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {carregando ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando cobrança...</>
              ) : (
                <><QrCode className="w-4 h-4" /> Gerar PIX para pagamento</>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Toggle expandir */}
              <button
                onClick={() => setExpandido(!expandido)}
                className="w-full flex items-center justify-between text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                <span className="flex items-center gap-1.5"><QrCode className="w-4 h-4" /> Ver opções de pagamento</span>
                {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandido && (
                <div className="space-y-4">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">QR Code PIX</p>
                    {dadosPix.pix_qrcode && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${dadosPix.pix_qrcode}`}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    )}
                  </div>

                  {/* Copia e Cola */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PIX Copia e Cola</p>
                    <div className="flex items-stretch gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 font-mono break-all overflow-hidden">
                        {dadosPix.pix_copia_cola}
                      </div>
                      <button
                        onClick={copiarPix}
                        className={`px-4 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                          copiado
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        {copiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Link de pagamento */}
                  <a
                    href={dadosPix.link_pagamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir link de pagamento
                  </a>
                </div>
              )}
            </div>
          )}

          {erro && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function PortalSocioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params)
  const [socio, setSocio] = useState<Socio | null>(null)
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'pagas'>('pendentes')

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setErro('')

    // Buscar sócio pelo token via service role (usando API route evita expor service key no client)
    const resSocio = await fetch(`/api/portal/socio?token=${token}`)
    if (!resSocio.ok) {
      setErro('Link inválido ou expirado.')
      setCarregando(false)
      return
    }
    const { socio: s, mensalidades: m } = await resSocio.json()
    setSocio(s)
    setMensalidades(m)
    setCarregando(false)
  }, [token])

  useEffect(() => { carregarDados() }, [carregarDados])

  const mensalidadesFiltradas = mensalidades.filter(m => {
    if (filtro === 'pendentes') return m.status === 'pendente' || m.status === 'vencido'
    if (filtro === 'pagas') return m.status === 'pago'
    return true
  })

  const totalPendente = mensalidades
    .filter(m => m.status === 'pendente' || m.status === 'vencido')
    .reduce((acc, m) => acc + m.valor, 0)

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Carregando suas faturas...</p>
        </div>
      </div>
    )
  }

  if (erro || !socio) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="font-semibold text-slate-800">Link inválido</p>
          <p className="text-sm text-slate-500">{erro || 'Este link de acesso não é válido ou expirou.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Portal do Sócio</h1>
              <p className="text-sm text-slate-500 mt-0.5">Clube de Sócios</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-sm">
                {socio.nome.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Info do sócio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-bold text-slate-900 text-lg">{socio.nome}</p>
          {socio.email && <p className="text-sm text-slate-500 mt-0.5">{socio.email}</p>}
          <div className="mt-3 flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              socio.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {socio.status === 'ativo' ? '● Ativo' : '● Inativo'}
            </span>
          </div>
        </div>

        {/* Resumo de pendências */}
        {totalPendente > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Total em aberto</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {mensalidades.filter(m => m.status === 'pendente' || m.status === 'vencido').length} mensalidade(s) pendente(s)
              </p>
            </div>
            <p className="text-xl font-bold text-amber-700">{formatarMoeda(totalPendente)}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2">
          {(['pendentes', 'pagas', 'todas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors capitalize ${
                filtro === f
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f === 'pendentes' ? 'Em aberto' : f === 'pagas' ? 'Pagas' : 'Todas'}
            </button>
          ))}
        </div>

        {/* Lista de mensalidades */}
        {mensalidadesFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">
              {filtro === 'pendentes' ? 'Nenhuma pendência! Tudo em dia 🎉' : 'Nenhuma mensalidade encontrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mensalidadesFiltradas.map(m => (
              <CartaoPagamento
                key={m.id}
                mensalidade={m}
                token={token}
                onPago={carregarDados}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Em caso de dúvidas, entre em contato com o clube.
        </p>
      </div>
    </div>
  )
}
