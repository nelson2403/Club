'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Plus, Edit2, Trash2, X, Boxes } from 'lucide-react'

const supabase = createClient()

function ModalCategoria({ categoria, onClose }: { categoria?: any; onClose: () => void }) {
  const qc = useQueryClient()
  const editando = !!categoria
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [descricao, setDescricao] = useState(categoria?.descricao ?? '')
  const [ativo, setAtivo] = useState(categoria?.ativo ?? true)
  const [erro, setErro] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (editando) {
        const { error } = await supabase.from('categorias_produto').update({ nome, descricao: descricao || null, ativo }).eq('id', categoria.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categorias_produto').insert({ nome, descricao: descricao || null, ativo })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias-completo'] }); onClose() },
    onError: (e: Error) => setErro(e.message),
  })

  const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{editando ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Cervejas, Drinks, Petiscos..." autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className={inputCls} placeholder="Descrição opcional" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAtivo(!ativo)}
              className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', ativo ? 'bg-blue-600' : 'bg-slate-200')}>
              <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm mt-1 transition-transform', ativo ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <span className="text-sm text-slate-600">{ativo ? 'Ativa' : 'Inativa'}</span>
          </div>
        </div>

        {erro && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => mutate()} disabled={isPending || !nome}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
            {isPending ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CategoriasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<any>(null)

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias-completo'],
    queryFn: async () => {
      const { data: cats, error } = await supabase.from('categorias_produto').select('*').order('nome')
      if (error) throw error

      const { data: prods } = await supabase.from('produtos').select('id, categoria_id')
      const contagem: Record<string, number> = {}
      ;(prods ?? []).forEach((p: any) => { if (p.categoria_id) contagem[p.categoria_id] = (contagem[p.categoria_id] ?? 0) + 1 })

      return (cats ?? []).map((c: any) => ({ ...c, total_produtos: contagem[c.id] ?? 0 }))
    },
  })

  const { mutate: deletar } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categorias_produto').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-completo'] }),
  })

  return (
    <div className="space-y-5 max-w-3xl">
      {modal !== null && <ModalCategoria categoria={modal === 'nova' ? undefined : modal} onClose={() => setModal(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Categorias de Produtos</h1>
          <p className="text-sm text-slate-500">{categorias?.length ?? 0} categorias cadastradas</p>
        </div>
        <button onClick={() => setModal('nova')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produtos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : (categorias ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Boxes className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Nenhuma categoria cadastrada</p>
                </td>
              </tr>
            ) : (categorias ?? []).map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-800">{c.nome}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.descricao ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full">{c.total_produtos}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', c.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                    {c.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setModal(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {c.total_produtos === 0 && (
                      <button onClick={() => { if (confirm('Excluir esta categoria?')) deletar(c.id) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
