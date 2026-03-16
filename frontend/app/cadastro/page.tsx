'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, User, Phone, Mail, CreditCard, ChevronRight } from 'lucide-react'

const supabase = createClient()

const inputCls =
  'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

function formatarCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function CadastroPublicoInner() {
  const params = useSearchParams()
  const planoParam = params.get('plano') ?? ''

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [planoId, setPlanoId] = useState(planoParam)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const { data: planos } = useQuery({
    queryKey: ['planos-publicos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planos')
        .select('id, nome_plano, valor_mensalidade, descricao')
        .eq('ativo', true)
        .order('valor_mensalidade')
      return data ?? []
    },
  })

  // Pré-selecionar plano da URL assim que os planos carregarem
  useEffect(() => {
    if (planoParam && planos?.find((p: any) => p.id === planoParam)) {
      setPlanoId(planoParam)
    }
  }, [planos, planoParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!nome.trim()) { setErro('Nome completo é obrigatório.'); return }
    if (!telefone.replace(/\D/g, '')) { setErro('WhatsApp/telefone é obrigatório.'); return }

    setEnviando(true)
    try {
      const res = await fetch('/api/public/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, cpf, telefone, email,
          data_nascimento: dataNasc,
          plano_id: planoId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao cadastrar')
      setSucesso(true)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro realizado!</h1>
          <p className="text-slate-500 text-sm">
            Seus dados foram enviados com sucesso. Em breve nossa equipe entrará em contato pelo WhatsApp para confirmar sua associação.
          </p>
          <p className="text-xs text-slate-400 pt-2">Clube de Sócios</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-8 py-7">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-black">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Clube de Sócios</h1>
          <p className="text-blue-100 text-sm mt-1">Preencha seus dados para se associar</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome completo *
            </label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className={inputCls} placeholder="Seu nome completo" autoFocus />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CPF</label>
              <input value={cpf} onChange={e => setCpf(formatarCPF(e.target.value))}
                className={inputCls} placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> WhatsApp *
              </label>
              <input value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))}
                className={inputCls} placeholder="(00) 00000-0000" maxLength={15} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputCls} placeholder="seu@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nascimento</label>
              <input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Plano pré-selecionado */}
          {planoParam && planoId && (() => {
            const plano = (planos ?? []).find((p: any) => p.id === planoId)
            if (!plano) return null
            return (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Plano de mensalidade
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl border-2 border-blue-500 bg-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{plano.nome_plano}</p>
                      {plano.descricao && <p className="text-xs text-slate-400">{plano.descricao}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    R$ {Number(plano.valor_mensalidade).toFixed(2)}
                    <span className="text-xs font-normal text-slate-400">/mês</span>
                  </span>
                </div>
              </div>
            )
          })()}

          {erro && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          <button type="submit" disabled={enviando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl
                       transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
            {enviando ? 'Enviando...' : <><ChevronRight className="w-4 h-4" /> Enviar Cadastro</>}
          </button>

          <p className="text-center text-xs text-slate-400 pb-2">
            Vencimento todo dia 10 · Seus dados estão protegidos
          </p>
        </form>
      </div>
    </div>
  )
}

export default function CadastroPublicoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100" />}>
      <CadastroPublicoInner />
    </Suspense>
  )
}
