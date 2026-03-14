'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { UserPlus, Search, CalendarDays } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

export default function DependentesPage() {
  const [busca, setBusca] = useState('')

  const { data: dependentes, isLoading } = useQuery({
    queryKey: ['dependentes-todos', busca],
    queryFn: async () => {
      let q = supabase
        .from('dependentes')
        .select('*, socios(id, nome, status)')
        .eq('ativo', true)
        .order('nome')

      if (busca.length >= 2) {
        q = q.ilike('nome', `%${busca}%`)
      }

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })

  const grauCor: Record<string, string> = {
    filho:   'bg-blue-100 text-blue-700',
    filha:   'bg-pink-100 text-pink-700',
    sobrinho: 'bg-purple-100 text-purple-700',
    sobrinha: 'bg-purple-100 text-purple-700',
    conjuge: 'bg-green-100 text-green-700',
    default: 'bg-slate-100 text-slate-600',
  }

  function corGrau(grau: string) {
    const key = grau.toLowerCase()
    return grauCor[key] ?? grauCor.default
  }

  function idade(dataNasc?: string) {
    if (!dataNasc) return null
    const diff = Date.now() - new Date(dataNasc).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dependentes</h1>
          <p className="text-sm text-slate-500">
            {dependentes?.length ?? 0} dependentes cadastrados
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={cn(
            'w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          )}
          placeholder="Buscar por nome do dependente..."
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Dependente</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Parentesco</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Idade</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Sócio Titular</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">CPF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : !dependentes?.length ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <UserPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400">Nenhum dependente cadastrado.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adicione dependentes na tela de edição do sócio.
                  </p>
                </td>
              </tr>
            ) : dependentes.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-800">{d.nome}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', corGrau(d.grau_parentesco))}>
                    {d.grau_parentesco}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {d.data_nascimento ? (
                    <span className="flex items-center gap-1 text-xs">
                      <CalendarDays className="w-3 h-3" />
                      {idade(d.data_nascimento)} anos
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {d.socios ? (
                    <Link href={`/socios/${d.socios.id}`}
                      className="text-blue-600 hover:underline text-sm">
                      {d.socios.nome}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                  {d.cpf ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Como cadastrar dependentes</p>
        <p className="text-xs text-blue-700">
          Acesse a página do sócio titular e role até a seção "Dependentes" para adicionar, editar ou remover dependentes.
        </p>
      </div>
    </div>
  )
}
