'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sociosApi } from '@/lib/api/socios'
import { formatarData, formatarCPF, formatarTelefone, cn, statusCorSocio } from '@/lib/utils'
import { Search, Plus, Eye, Edit2, UserX, UserCheck, Trash2, Send, Bell } from 'lucide-react'
import Link from 'next/link'
import { useAlterarStatusSocio } from '@/hooks/useSocios'
import { createClient } from '@/lib/supabase/client'
import type { StatusSocio } from '@/types/database'

const supabase = createClient()

export default function SociosPage() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [confirmExcluir, setConfirmExcluir] = useState<{ id: string; nome: string } | null>(null)
  const { mutate: alterarStatus } = useAlterarStatusSocio()

  const { data: isAdmin } = useQuery({
    queryKey: ['usuario-tipo'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const { data } = await supabase.from('usuarios').select('tipo_usuario').eq('id', user.id).single()
      return data?.tipo_usuario === 'master'
    },
  })

  const { mutate: excluir, isPending: excluindo } = useMutation({
    mutationFn: (id: string) => sociosApi.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios'] })
      setConfirmExcluir(null)
    },
    onError: (e: Error) => alert('Erro ao excluir: ' + e.message),
  })

  const [envioStatus, setEnvioStatus] = useState<string | null>(null)

  async function dispararEnvio(tipo: 'mensal' | 'lembrete') {
    setEnvioStatus('enviando')
    try {
      const { data, error } = await supabase.functions.invoke('enviar-cobrancas', {
        body: { tipo },
      })
      if (error) throw error
      const msg = tipo === 'mensal'
        ? `Faturas enviadas: ${data?.enviados ?? 0} | Sem telefone: ${data?.sem_telefone ?? 0} | Erros: ${data?.erros ?? 0}`
        : `Lembretes enviados: ${data?.enviados ?? 0} | Sem telefone: ${data?.sem_telefone ?? 0} | Erros: ${data?.erros ?? 0}`
      setEnvioStatus(msg)
    } catch (e: any) {
      setEnvioStatus('Erro: ' + e.message)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['socios', 'list', { busca, status, page }],
    queryFn: () => sociosApi.listar({ busca: busca || undefined, status: status || undefined, page }),
  })

  const socios = data?.data ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.ceil(total / 20)

  return (
    <div className="space-y-5">
      {/* Modal confirmação excluir */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Excluir sócio?</p>
                <p className="text-sm text-gray-500">{confirmExcluir.nome}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Todos os dados do sócio (mensalidades, histórico) serão removidos permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExcluir(null)}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => excluir(confirmExcluir.id)} disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sócios</h1>
          <p className="text-sm text-gray-500">{total} sócios cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => dispararEnvio('mensal')}
                disabled={envioStatus === 'enviando'}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white
                           text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                title="Gera cobrança Asaas e envia WhatsApp para todos os sócios com mensalidade pendente do mês"
              >
                <Send className="w-4 h-4" />
                Enviar Fatura do Mês
              </button>
              <button
                onClick={() => dispararEnvio('lembrete')}
                disabled={envioStatus === 'enviando'}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white
                           text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                title="Envia lembrete de vencimento amanhã para sócios com mensalidade pendente"
              >
                <Bell className="w-4 h-4" />
                Lembrete de Vencimento
              </button>
            </>
          )}
          <Link
            href="/socios/novo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                       text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Sócio
          </Link>
        </div>
      </div>

      {/* Resultado do envio */}
      {envioStatus && envioStatus !== 'enviando' && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <span>{envioStatus}</span>
          <button onClick={() => setEnvioStatus(null)} className="text-green-600 hover:text-green-800 font-medium text-xs">
            Fechar
          </button>
        </div>
      )}
      {envioStatus === 'enviando' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <Send className="w-4 h-4 animate-pulse" /> Enviando mensagens... aguarde.
        </div>
      )}

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
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmExcluir({ id: socio.id, nome: socio.nome })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir sócio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
