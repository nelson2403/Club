'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarData, cn } from '@/lib/utils'
import { Plus, Edit2, UserX, UserCheck, Key, X, Check } from 'lucide-react'
import type { TipoUsuario, Usuario } from '@/types/database'

const supabase = createClient()

const tipoLabel: Record<string, string> = {
  master: 'Master',
  admin: 'Master',          // legacy
  administrador: 'Administrador',
  gerente: 'Administrador', // legacy
  operador: 'Operador',
  caixa: 'Operador',        // legacy
}

const tipoCor: Record<string, string> = {
  master: 'bg-purple-100 text-purple-700',
  admin: 'bg-purple-100 text-purple-700',
  administrador: 'bg-blue-100 text-blue-700',
  gerente: 'bg-blue-100 text-blue-700',
  operador: 'bg-gray-100 text-gray-600',
  caixa: 'bg-gray-100 text-gray-600',
}

// ============================================================
// Modal Criar / Editar Usuário
// ============================================================
function ModalUsuario({
  usuario, onClose,
}: {
  usuario?: Usuario
  onClose: () => void
}) {
  const qc = useQueryClient()
  const editando = !!usuario
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [senha, setSenha] = useState('')
  const [tipo, setTipo] = useState<TipoUsuario>(usuario?.tipo_usuario ?? 'operador')
  const [erro, setErro] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (editando) {
        // Atualizar dados do usuário
        const { error } = await supabase
          .from('usuarios')
          .update({ nome, tipo_usuario: tipo })
          .eq('id', usuario!.id)
        if (error) throw error

        // Atualizar senha se fornecida (requer service role — via Edge Function em produção)
        // Por ora apenas atualiza metadados
      } else {
        // Criar novo usuário via Supabase Auth Admin API
        // Em produção usar Edge Function com service_role_key
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome, tipo_usuario: tipo },
          },
        })
        if (error) throw error
        if (!data.user) throw new Error('Falha ao criar usuário')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: (e: Error) => setErro(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {editando ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do usuário" />
          </div>

          {!editando && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@exemplo.com" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha inicial</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de acesso</label>
            <div className="grid grid-cols-3 gap-2">
              {(['operador', 'administrador', 'master'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t as any)}
                  className={cn(
                    'py-2.5 rounded-xl border-2 text-xs font-medium transition-colors',
                    tipo === t
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {tipoLabel[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição do tipo selecionado */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            {tipo === 'master' && 'Acesso total ao sistema. Pode criar usuários, gerenciar todas as configurações e módulos.'}
            {tipo === 'admin' && 'Acesso total ao sistema. Pode criar usuários, gerenciar todas as configurações e módulos.'}
            {tipo === 'administrador' && 'Acesso completo ao gerencial: sócios, mensalidades, estoque, financeiro e relatórios. Não cria usuários Master.'}
            {tipo === 'gerente' && 'Acesso completo ao gerencial: sócios, mensalidades, estoque, financeiro e relatórios. Não cria usuários Master.'}
            {tipo === 'operador' && 'Acesso apenas ao PDV: fazer vendas, abrir e fechar caixa. Responsável pelo caixa em aberto.'}
            {tipo === 'caixa' && 'Acesso apenas ao PDV: fazer vendas, abrir e fechar caixa. Responsável pelo caixa em aberto.'}
          </div>
        </div>

        {erro && (
          <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => mutate()} disabled={isPending || !nome || (!editando && (!email || senha.length < 6))}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
            {isPending ? 'Salvando...' : editando ? 'Salvar' : 'Criar Usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Página principal
// ============================================================
export default function UsuariosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'novo' | Usuario | null>(null)

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome')
      if (error) throw error
      return data ?? []
    },
  })

  const { mutate: alterarAtivo } = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('usuarios').update({ ativo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return (
    <div className="space-y-5 max-w-3xl">
      {modal && (
        <ModalUsuario
          usuario={modal === 'novo' ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários do Sistema</h1>
          <p className="text-sm text-gray-500">{usuarios?.length ?? 0} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setModal('novo')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Grupos de acesso */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Master', desc: 'Acesso total', count: usuarios?.filter(u => u.tipo_usuario === 'master' || u.tipo_usuario === 'admin').length ?? 0, cor: 'bg-purple-600' },
          { label: 'Administrador', desc: 'Acesso gerencial', count: usuarios?.filter(u => u.tipo_usuario === 'administrador' || u.tipo_usuario === 'gerente').length ?? 0, cor: 'bg-blue-600' },
          { label: 'Operador', desc: 'Acesso ao PDV', count: usuarios?.filter(u => u.tipo_usuario === 'operador' || u.tipo_usuario === 'caixa').length ?? 0, cor: 'bg-slate-600' },
        ].map((g) => (
          <div key={g.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${g.cor} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xl font-bold">{g.count}</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{g.label}</p>
              <p className="text-xs text-slate-400">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Usuário</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cadastro</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : (usuarios ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{u.nome}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', tipoCor[u.tipo_usuario] ?? 'bg-gray-100 text-gray-600')}>
                    {tipoLabel[u.tipo_usuario] ?? u.tipo_usuario}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatarData(u.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {u.ativo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setModal(u)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => alterarAtivo({ id: u.id, ativo: !u.ativo })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {u.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Sobre a criação de usuários</p>
        <p className="text-xs text-amber-700">
          Novos usuários receberão um e-mail de confirmação do Supabase. Para ambientes de produção,
          configure uma Edge Function com <code className="bg-amber-100 px-1 rounded">service_role_key</code> para
          criação sem confirmação de e-mail.
        </p>
      </div>
    </div>
  )
}
