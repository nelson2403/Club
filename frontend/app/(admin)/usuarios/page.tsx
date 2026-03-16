'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarData, cn } from '@/lib/utils'
import { Plus, Edit2, UserX, UserCheck, Key, X, Check, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { TipoUsuario, Usuario } from '@/types/database'

const supabase = createClient()

const tipoLabel: Record<string, string> = {
  master:        'Master',
  admin:         'Master',
  administrador: 'Administrador',
  gerente:       'Administrador',
  operador:      'Operador',
  caixa:         'Operador',
}

const tipoCor: Record<string, string> = {
  master:        'bg-purple-100 text-purple-700',
  admin:         'bg-purple-100 text-purple-700',
  administrador: 'bg-blue-100 text-blue-700',
  gerente:       'bg-blue-100 text-blue-700',
  operador:      'bg-gray-100 text-gray-600',
  caixa:         'bg-gray-100 text-gray-600',
}

const inputCls = cn(
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
  'focus:outline-none focus:ring-2 focus:ring-blue-500'
)

// ============================================================
// Modal Alterar Senha
// ============================================================
function ModalAlterarSenha({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (senha !== confirmar) throw new Error('As senhas não conferem')
      if (senha.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres')

      const res = await fetch('/api/usuarios/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: usuario.id, nova_senha: senha }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao alterar senha')
    },
    onSuccess: onClose,
    onError: (e: Error) => setErro(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Alterar Senha</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Alterando senha de <strong className="text-gray-800">{usuario.nome}</strong>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nova senha</label>
            <div className="relative">
              <input
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={cn(inputCls, 'pr-10')}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar nova senha</label>
            <input
              type={mostrar ? 'text' : 'password'}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={inputCls}
              placeholder="Repita a senha"
            />
          </div>
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !senha || !confirmar}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
          >
            {isPending ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal Criar / Editar Usuário
// ============================================================
function ModalUsuario({ usuario, onClose }: { usuario?: Usuario; onClose: () => void }) {
  const qc = useQueryClient()
  const editando = !!usuario
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [senha, setSenha] = useState('')
  const [tipo, setTipo] = useState<TipoUsuario>(usuario?.tipo_usuario ?? 'operador')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (editando) {
        const { error } = await supabase
          .from('usuarios')
          .update({ nome, tipo_usuario: tipo })
          .eq('id', usuario!.id)
        if (error) throw error
      } else {
        // Usa API route com service_role_key — sem e-mail de confirmação
        const res = await fetch('/api/usuarios/criar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, senha, tipo_usuario: tipo }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Erro ao criar usuário')
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
              className={inputCls} placeholder="Nome do usuário" />
          </div>

          {!editando && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha inicial</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={cn(inputCls, 'pr-10')}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de acesso</label>
            <div className="grid grid-cols-3 gap-2">
              {(['operador', 'administrador', 'master'] as const).map((t) => (
                <button key={t} onClick={() => setTipo(t as TipoUsuario)}
                  className={cn(
                    'py-2.5 rounded-xl border-2 text-xs font-medium transition-colors',
                    tipo === t
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}>
                  {tipoLabel[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            {(tipo === 'master' || tipo === 'admin') && 'Acesso total ao sistema. Pode criar usuários e gerenciar todas as configurações.'}
            {(tipo === 'administrador' || tipo === 'gerente') && 'Acesso completo ao gerencial: sócios, mensalidades, estoque, financeiro e relatórios.'}
            {(tipo === 'operador' || tipo === 'caixa') && 'Acesso apenas ao PDV: fazer vendas, abrir e fechar caixa.'}
          </div>
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !nome || (!editando && (!email || senha.length < 6))}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
          >
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
  const [modalSenha, setModalSenha] = useState<Usuario | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<Usuario | null>(null)

  const { mutate: excluirUsuario, isPending: excluindo } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/usuarios/excluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao excluir')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setConfirmExcluir(null)
    },
    onError: (e: Error) => alert('Erro ao excluir: ' + e.message),
  })

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
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Excluir usuário?</p>
                <p className="text-sm text-gray-500">{confirmExcluir.nome}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              O usuário perderá o acesso ao sistema permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExcluir(null)}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => excluirUsuario(confirmExcluir.id)} disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <ModalUsuario
          usuario={modal === 'novo' ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
      {modalSenha && (
        <ModalAlterarSenha
          usuario={modalSenha}
          onClose={() => setModalSenha(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários do Sistema</h1>
          <p className="text-sm text-gray-500">{usuarios?.length ?? 0} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setModal('novo')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
              <th className="px-4 py-3 w-48" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : (usuarios ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{u.nome}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{u.email}</td>
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
                <td className="px-4 py-3 w-48 whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setModalSenha(u)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Alterar senha"
                    >
                      <Key className="w-4 h-4" />
                    </button>
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
                    <button
                      onClick={() => setConfirmExcluir(u)}
                      className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        <p className="font-medium mb-1">Criação de usuários sem e-mail de confirmação</p>
        <p className="text-xs text-green-700">
          Novos usuários são criados diretamente pelo administrador e já ficam ativos imediatamente.
          Apenas administradores podem alterar senhas. Não há redefinição automática por e-mail.
        </p>
      </div>
    </div>
  )
}
