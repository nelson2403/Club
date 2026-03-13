'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sociosApi } from '@/lib/api/socios'
import { formatarData, formatarCPF, formatarTelefone, cn, statusCorSocio } from '@/lib/utils'
import { Search, Plus, Eye, Edit2, UserX, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { useAlterarStatusSocio } from '@/hooks/useSocios'
import type { StatusSocio } from '@/types/database'

export default function SociosPage() {
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { mutate: alterarStatus } = useAlterarStatusSocio()

  const { data, isLoading } = useQuery({
    queryKey: ['socios', 'list', { busca, status, page }],
    queryFn: () => sociosApi.listar({ busca: busca || undefined, status: status || undefined, page }),
  })

  const socios = data?.data ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.ceil(total / 20)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sócios</h1>
          <p className="text-sm text-gray-500">{total} sócios cadastrados</p>
        </div>
        <Link
          href="/socios/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Sócio
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1) }}
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
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CPF</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plano</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cadastro</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : socios.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  Nenhum sócio encontrado
                </td>
              </tr>
            ) : (
              socios.map((socio) => {
                const planoAtivo = (socio as any).socios_planos?.find(
                  (sp: any) => sp.status === 'ativo'
                )
                return (
                  <tr key={socio.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{socio.nome}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {socio.cpf ? formatarCPF(socio.cpf) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {socio.telefone ? formatarTelefone(socio.telefone) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {planoAtivo?.planos?.nome_plano ?? (
                        <span className="text-orange-500 text-xs">Sem plano</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatarData(socio.data_cadastro)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusCorSocio(socio.status))}>
                        {socio.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/socios/${socio.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/socios/${socio.id}/editar`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => alterarStatus({
                            id: socio.id,
                            status: socio.status === 'ativo' ? 'inativo' : 'ativo',
                          })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title={socio.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        >
                          {socio.status === 'ativo'
                            ? <UserX className="w-4 h-4" />
                            : <UserCheck className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Página {page} de {totalPaginas} ({total} registros)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg
                           disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page === totalPaginas}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg
                           disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
