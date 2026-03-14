'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { controleAcessoApi } from '@/lib/api/controle-acesso'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus, Trash2, Fingerprint, CreditCard, Hash, Search, X } from 'lucide-react'
import Link from 'next/link'
import type { AcessoBiometria } from '@/types/database'

const supabase = createClient()

const inputCls = cn(
  'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
)

const tipoIcons = {
  biometria: Fingerprint,
  codigo:    Hash,
  cartao:    CreditCard,
}

const tipoLabel = {
  biometria: 'Biometria',
  codigo:    'Código',
  cartao:    'Cartão',
}

function ModalNovaBiometria({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [socioId, setSocioId] = useState('')
  const [depId, setDepId] = useState('')
  const [tipo, setTipo] = useState<'biometria' | 'codigo' | 'cartao'>('codigo')
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')

  const { data: socios } = useQuery({
    queryKey: ['socios-busca-bio', busca],
    queryFn: async () => {
      if (busca.length < 2) return []
      const { data } = await supabase
        .from('socios')
        .select('id, nome, status')
        .ilike('nome', `%${busca}%`)
        .limit(6)
      return data ?? []
    },
    enabled: busca.length >= 2,
  })

  const { data: dependentes } = useQuery({
    queryKey: ['dependentes-biometria', socioId],
    queryFn: async () => {
      if (!socioId) return []
      const { data } = await supabase
        .from('dependentes')
        .select('id, nome, grau_parentesco')
        .eq('socio_id', socioId)
        .eq('ativo', true)
      return data ?? []
    },
    enabled: !!socioId,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => controleAcessoApi.criarBiometria({
      socio_id:      depId ? undefined : socioId || undefined,
      dependente_id: depId || undefined,
      tipo, codigo: codigo || undefined, descricao: descricao || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biometrias'] })
      onClose()
    },
    onError: (e: Error) => setErro(e.message),
  })

  const socioSelecionado = socios?.find(s => s.id === socioId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nova Biometria / Código</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Busca de sócio */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">Sócio</label>
          {!socioId ? (
            <>
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                className={inputCls} placeholder="Buscar por nome..." />
              {socios && socios.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {socios.map(s => (
                    <button key={s.id}
                      onClick={() => { setSocioId(s.id); setBusca('') }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0">
                      {s.nome}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl">
              <span className="text-sm font-medium text-blue-900">{socioSelecionado?.nome}</span>
              <button onClick={() => { setSocioId(''); setDepId('') }}
                className="text-blue-400 hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dependente (opcional) */}
        {socioId && dependentes && dependentes.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Dependente (opcional)
            </label>
            <select value={depId} onChange={(e) => setDepId(e.target.value)}
              className={inputCls}>
              <option value="">Sócio titular</option>
              {dependentes.map(d => (
                <option key={d.id} value={d.id}>{d.nome} — {d.grau_parentesco}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de acesso</label>
          <div className="grid grid-cols-3 gap-2">
            {(['codigo', 'cartao', 'biometria'] as const).map((t) => {
              const Icon = tipoIcons[t]
              return (
                <button key={t} onClick={() => setTipo(t)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors',
                    tipo === t
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}>
                  <Icon className="w-4 h-4" />
                  {tipoLabel[t]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Código */}
        {tipo !== 'biometria' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Código / Número</label>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
              className={inputCls} placeholder="Ex: 001234, CARD-5678..." />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição (opcional)</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)}
            className={inputCls} placeholder="Ex: Cartão principal, Digital direita..." />
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-slate-300 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={() => mutate()} disabled={isPending || !socioId}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-60">
            {isPending ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BiometriasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')

  const { data: biometrias, isLoading } = useQuery({
    queryKey: ['biometrias'],
    queryFn: () => controleAcessoApi.listarBiometrias(),
  })

  const { mutate: remover } = useMutation({
    mutationFn: (id: string) => controleAcessoApi.removerBiometria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biometrias'] }),
  })

  const filtradas = biometrias?.filter(b => {
    if (!busca) return true
    const nome = b.socios?.nome ?? b.dependentes?.nome ?? ''
    return nome.toLowerCase().includes(busca.toLowerCase())
  })

  return (
    <div className="space-y-5 max-w-4xl">
      {modal && <ModalNovaBiometria onClose={() => setModal(false)} />}

      <div className="flex items-center gap-3">
        <Link href="/controle-acesso"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Biometrias e Códigos</h1>
          <p className="text-sm text-slate-500">{biometrias?.length ?? 0} registros cadastrados</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Nova Biometria
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          className={cn(inputCls, 'pl-9')}
          placeholder="Filtrar por nome do sócio..." />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Pessoa</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Descrição</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : !filtradas?.length ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum registro encontrado.</td></tr>
            ) : filtradas.map((b) => {
              const Icon = tipoIcons[b.tipo]
              return (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">
                      {b.socios?.nome ?? b.dependentes?.nome ?? '—'}
                    </p>
                    {b.dependentes && (
                      <p className="text-xs text-slate-400">Dependente — {b.dependentes.grau_parentesco}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      <Icon className="w-3 h-3" />
                      {tipoLabel[b.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {b.codigo ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {b.descricao ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('Remover este código de acesso?')) remover(b.id)
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
