'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { controleAcessoApi } from '@/lib/api/controle-acesso'
import { cn } from '@/lib/utils'
import {
  DoorOpen, Search, UserCheck, UserX, Clock,
  LogIn, LogOut, History, Fingerprint,
} from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

const inputCls = cn(
  'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
)

export default function ControleAcessoPage() {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [busca, setBusca] = useState('')
  const [resultado, setResultado] = useState<{
    liberado: boolean; nome?: string; motivo?: string; socio_id?: string
  } | null>(null)
  const [tipoManual, setTipoManual] = useState<'entrada' | 'saida'>('entrada')

  // Últimos 30 acessos
  const { data: recentes } = useQuery({
    queryKey: ['registros-acesso-recentes'],
    queryFn: () => controleAcessoApi.listarRegistros({ limite: 30 }),
    refetchInterval: 15000,
  })

  // Busca de sócios
  const { data: socios } = useQuery({
    queryKey: ['socios-busca', busca],
    queryFn: async () => {
      if (busca.length < 2) return []
      const { data } = await supabase
        .from('socios')
        .select('id, nome, status')
        .ilike('nome', `%${busca}%`)
        .eq('status', 'ativo')
        .limit(8)
      return data ?? []
    },
    enabled: busca.length >= 2,
  })

  const { mutate: registrar, isPending } = useMutation({
    mutationFn: async (params: { socio_id: string; tipo: 'entrada' | 'saida' }) => {
      const verificacao = await controleAcessoApi.verificarAcesso({ socio_id: params.socio_id })
      await controleAcessoApi.registrarAcesso({
        socio_id: params.socio_id,
        tipo: params.tipo,
        liberado: verificacao.liberado,
        motivo_bloqueio: verificacao.liberado ? undefined : verificacao.motivo,
      })
      setResultado(verificacao)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registros-acesso-recentes'] })
      setBusca('')
      setTimeout(() => setResultado(null), 4000)
    },
  })

  const { mutate: verificarCodigo } = useMutation({
    mutationFn: async () => {
      const verificacao = await controleAcessoApi.verificarAcesso({ codigo: codigo.trim() })
      if (verificacao.socio_id) {
        await controleAcessoApi.registrarAcesso({
          socio_id: verificacao.socio_id,
          tipo: tipoManual,
          liberado: verificacao.liberado,
          motivo_bloqueio: verificacao.liberado ? undefined : verificacao.motivo,
        })
      }
      setResultado(verificacao)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registros-acesso-recentes'] })
      setCodigo('')
      setTimeout(() => setResultado(null), 4000)
    },
  })

  const totalHoje = recentes?.filter(r => {
    const hoje = new Date().toDateString()
    return new Date(r.data_hora).toDateString() === hoje
  }).length ?? 0

  const bloqueadosHoje = recentes?.filter(r => {
    const hoje = new Date().toDateString()
    return !r.liberado && new Date(r.data_hora).toDateString() === hoje
  }).length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Controle de Acesso</h1>
          <p className="text-sm text-slate-500">Registro de entradas e saídas via catraca</p>
        </div>
        <div className="flex gap-2">
          <Link href="/controle-acesso/biometrias"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            <Fingerprint className="w-4 h-4" />
            Biometrias
          </Link>
          <Link href="/controle-acesso/historico"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            <History className="w-4 h-4" />
            Histórico
          </Link>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <DoorOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalHoje}</p>
            <p className="text-xs text-slate-500">Acessos hoje</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalHoje - bloqueadosHoje}</p>
            <p className="text-xs text-slate-500">Liberados hoje</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <UserX className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{bloqueadosHoje}</p>
            <p className="text-xs text-slate-500">Bloqueados hoje</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Painel de verificação */}
        <div className="space-y-4">
          {/* Resultado da verificação */}
          {resultado && (
            <div className={cn(
              'rounded-2xl border-2 p-5 flex items-center gap-4 transition-all',
              resultado.liberado
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            )}>
              {resultado.liberado
                ? <UserCheck className="w-10 h-10 text-green-600 flex-shrink-0" />
                : <UserX className="w-10 h-10 text-red-600 flex-shrink-0" />
              }
              <div>
                <p className={cn('text-lg font-bold', resultado.liberado ? 'text-green-800' : 'text-red-800')}>
                  {resultado.liberado ? 'ACESSO LIBERADO' : 'ACESSO NEGADO'}
                </p>
                <p className={cn('text-sm', resultado.liberado ? 'text-green-700' : 'text-red-700')}>
                  {resultado.nome ?? ''}
                  {!resultado.liberado && resultado.motivo && ` — ${resultado.motivo}`}
                </p>
              </div>
            </div>
          )}

          {/* Verificar por código */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-blue-600" />
              Verificar por Código / Biometria
            </h2>
            <div className="flex gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTipoManual('entrada')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors',
                    tipoManual === 'entrada'
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  <LogIn className="w-4 h-4" /> Entrada
                </button>
                <button
                  onClick={() => setTipoManual('saida')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors',
                    tipoManual === 'saida'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  <LogOut className="w-4 h-4" /> Saída
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && codigo.trim() && verificarCodigo()}
                className={inputCls}
                placeholder="Digite o código ou matricula..."
                autoFocus
              />
              <button
                onClick={() => verificarCodigo()}
                disabled={!codigo.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                Verificar
              </button>
            </div>
          </div>

          {/* Registrar manualmente por nome */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Buscar Sócio por Nome
            </h2>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={inputCls}
              placeholder="Nome do sócio..."
            />
            {socios && socios.length > 0 && (
              <div className="space-y-1">
                {socios.map((s) => (
                  <div key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-800">{s.nome}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => registrar({ socio_id: s.id, tipo: 'entrada' })}
                        disabled={isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <LogIn className="w-3 h-3" /> Entrada
                      </button>
                      <button
                        onClick={() => registrar({ socio_id: s.id, tipo: 'saida' })}
                        disabled={isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <LogOut className="w-3 h-3" /> Saída
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Acessos recentes */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Acessos Recentes</h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
            {!recentes?.length ? (
              <p className="text-center text-slate-400 text-sm py-10">Nenhum acesso registrado.</p>
            ) : recentes.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                  r.liberado
                    ? r.tipo === 'entrada' ? 'bg-green-100' : 'bg-blue-100'
                    : 'bg-red-100'
                )}>
                  {r.liberado
                    ? r.tipo === 'entrada'
                      ? <LogIn className="w-4 h-4 text-green-600" />
                      : <LogOut className="w-4 h-4 text-blue-600" />
                    : <UserX className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {r.socios?.nome ?? r.dependentes?.nome ?? 'Desconhecido'}
                    {r.dependentes && (
                      <span className="ml-1 text-xs text-slate-400">(dep.)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.liberado ? (r.tipo === 'entrada' ? 'Entrada' : 'Saída') : r.motivo_bloqueio ?? 'Bloqueado'}
                  </p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(r.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
