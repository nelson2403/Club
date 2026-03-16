'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda, cn } from '@/lib/utils'
import { Plus, Edit2, X, Calendar, DollarSign, CheckCircle, XCircle, ClipboardList, Trash2 } from 'lucide-react'

const supabase = createClient()

function ModalPlano({ plano, onClose }: { plano?: any; onClose: () => void }) {
  const qc = useQueryClient()
  const editando = !!plano
  const [nome, setNome] = useState(plano?.nome_plano ?? '')
  const [valor, setValor] = useState(plano?.valor_mensalidade?.toString() ?? '')
  const [descricao, setDescricao] = useState(plano?.descricao ?? '')
  const [ativo, setAtivo] = useState(plano?.ativo ?? true)
  const [erro, setErro] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const dados = {
        nome_plano: nome,
        valor_mensalidade: parseFloat(valor),
        dia_vencimento: 10,   // sempre dia 10
        descricao: descricao || null,
        ativo,
      }
      if (editando) {
        const { error } = await supabase.from('planos').update(dados).eq('id', plano.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('planos').insert(dados)
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planos'] }); onClose() },
    onError: (e: Error) => setErro(e.message),
  })

  const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{editando ? 'Editar Plano' : 'Novo Plano'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Plano *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Plano Mensal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor Mensal (R$) *</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={inputCls} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dia de Vencimento</label>
              <input type="text" value="10 (fixo)" disabled className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} className={inputCls} placeholder="Benefícios do plano..." />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAtivo(!ativo)}
              className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', ativo ? 'bg-blue-600' : 'bg-slate-200')}
            >
              <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm mt-1 transition-transform', ativo ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <span className="text-sm text-slate-600">{ativo ? 'Plano ativo' : 'Plano inativo'}</span>
          </div>
        </div>

        {erro && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => mutate()} disabled={isPending || !nome || !valor}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
            {isPending ? 'Salvando...' : editando ? 'Salvar' : 'Criar Plano'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlanosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<any>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<{ id: string; nome: string } | null>(null)

  const { data: isAdmin } = useQuery({
    queryKey: ['usuario-tipo'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const { data } = await supabase.from('usuarios').select('tipo_usuario').eq('id', user.id).single()
      return data?.tipo_usuario === 'admin'
    },
  })

  const { mutate: excluir, isPending: excluindo } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planos'] })
      setConfirmExcluir(null)
    },
    onError: (e: Error) => alert('Erro ao excluir: ' + e.message),
  })

  const { data: planos, isLoading } = useQuery({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('planos').select('*').order('valor_mensalidade')
      if (error) throw error
      return data ?? []
    },
  })

  const { mutate: toggleAtivo } = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('planos').update({ ativo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos'] }),
  })

  const ativos = planos?.filter(p => p.ativo).length ?? 0
  const inativos = planos?.filter(p => !p.ativo).length ?? 0

  return (
    <div className="space-y-5 max-w-4xl">
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Excluir plano?</p>
                <p className="text-sm text-slate-500">{confirmExcluir.nome}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              O plano será removido permanentemente. Planos com sócios vinculados não podem ser excluídos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExcluir(null)}
                className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50">
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

      {modal !== null && <ModalPlano plano={modal === 'novo' ? undefined : modal} onClose={() => setModal(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Planos de Mensalidade</h1>
          <p className="text-sm text-slate-500">{ativos} ativo(s) · {inativos} inativo(s)</p>
        </div>
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-40 animate-pulse" />)}
        </div>
      ) : (planos ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">Nenhum plano cadastrado</p>
          <p className="text-sm text-slate-400 mt-1">Crie o primeiro plano para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(planos ?? []).map((p: any) => (
            <div key={p.id} className={cn('bg-white rounded-2xl border p-5 space-y-3', p.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{p.nome_plano}</p>
                  {p.descricao && <p className="text-xs text-slate-400 mt-0.5">{p.descricao}</p>}
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium', p.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xl font-bold">{formatarMoeda(p.valor_mensalidade)}</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                Vencimento todo dia 10
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                <button onClick={() => setModal(p)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => toggleAtivo({ id: p.id, ativo: !p.ativo })}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors ml-auto">
                  {p.ativo ? <><XCircle className="w-3.5 h-3.5" /> Desativar</> : <><CheckCircle className="w-3.5 h-3.5" /> Ativar</>}
                </button>
                {isAdmin && (
                  <button onClick={() => setConfirmExcluir({ id: p.id, nome: p.nome_plano })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir plano">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
