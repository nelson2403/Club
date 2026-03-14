'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { controleAcessoApi } from '@/lib/api/controle-acesso'
import { cn } from '@/lib/utils'
import { ArrowLeft, LogIn, LogOut, UserX, Filter } from 'lucide-react'
import Link from 'next/link'

const inputCls = cn(
  'px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
)

export default function HistoricoAcessosPage() {
  const hoje = new Date().toISOString().split('T')[0]
  const [dataInicio, setDataInicio] = useState(hoje)
  const [dataFim, setDataFim] = useState(hoje)
  const [tipo, setTipo] = useState<'' | 'entrada' | 'saida'>('')
  const [somente, setSomente] = useState<'' | 'liberado' | 'bloqueado'>('')

  const { data: registros, isLoading } = useQuery({
    queryKey: ['registros-acesso', dataInicio, dataFim, tipo, somente],
    queryFn: () => controleAcessoApi.listarRegistros({
      data_inicio: dataInicio ? `${dataInicio}T00:00:00` : undefined,
      data_fim:    dataFim    ? `${dataFim}T23:59:59`    : undefined,
      tipo:        tipo       || undefined,
      liberado:    somente === 'liberado' ? true : somente === 'bloqueado' ? false : undefined,
      limite:      500,
    }),
  })

  const totalEntradas  = registros?.filter(r => r.tipo === 'entrada').length ?? 0
  const totalSaidas    = registros?.filter(r => r.tipo === 'saida').length ?? 0
  const totalBloqueados = registros?.filter(r => !r.liberado).length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/controle-acesso"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Histórico de Acessos</h1>
          <p className="text-sm text-slate-500">{registros?.length ?? 0} registros encontrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">De:</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
              className={inputCls} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Até:</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className={inputCls} />
          </div>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as '' | 'entrada' | 'saida')}
            className={inputCls}>
            <option value="">Entrada e Saída</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <select value={somente} onChange={(e) => setSomente(e.target.value as '' | 'liberado' | 'bloqueado')}
            className={inputCls}>
            <option value="">Todos</option>
            <option value="liberado">Liberados</option>
            <option value="bloqueado">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Entradas', value: totalEntradas, cor: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Saídas',   value: totalSaidas,   cor: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Bloqueados', value: totalBloqueados, cor: 'text-red-600', bg: 'bg-red-50' },
        ].map((c) => (
          <div key={c.label} className={cn('rounded-2xl border border-slate-200 p-4 text-center', c.bg)}>
            <p className={cn('text-2xl font-bold', c.cor)}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Pessoa</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Terminal</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Data / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : !registros?.length ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum registro encontrado.</td></tr>
            ) : registros.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">
                    {r.socios?.nome ?? r.dependentes?.nome ?? '—'}
                  </p>
                  {r.dependentes && (
                    <p className="text-xs text-slate-400">Dependente — {r.dependentes.grau_parentesco}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    r.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {r.tipo === 'entrada'
                      ? <><LogIn className="w-3 h-3" /> Entrada</>
                      : <><LogOut className="w-3 h-3" /> Saída</>
                    }
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.liberado ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Liberado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      <UserX className="w-3 h-3" />
                      {r.motivo_bloqueio ?? 'Bloqueado'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.terminal ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(r.data_hora).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
