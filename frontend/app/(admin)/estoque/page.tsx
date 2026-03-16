'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { produtosApi } from '@/lib/api/produtos'
import { formatarMoeda, cn } from '@/lib/utils'
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, RotateCcw, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TipoMovimentacao } from '@/types/database'

const supabase = createClient()

function ModalMovimentacao({
  produtoId, nomeProduto, onClose,
}: {
  produtoId: string
  nomeProduto: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<TipoMovimentacao>('entrada')
  const [quantidade, setQuantidade] = useState('1')
  const [observacao, setObservacao] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      produtosApi.movimentarEstoque(produtoId, tipo, parseFloat(quantidade), observacao),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Movimentar Estoque</h2>
        <p className="text-sm text-gray-500">{nomeProduto}</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'entrada', label: 'Entrada', icon: ArrowUp, cor: 'green' },
              { value: 'saida', label: 'Saída', icon: ArrowDown, cor: 'red' },
              { value: 'ajuste', label: 'Ajuste', icon: RotateCcw, cor: 'blue' },
            ] as const).map(({ value, label, icon: Icon, cor }) => (
              <button
                key={value}
                onClick={() => setTipo(value)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-colors',
                  tipo === value
                    ? cor === 'green'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : cor === 'red'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {tipo === 'ajuste' && (
            <p className="text-xs text-gray-400 mt-1">No ajuste, informe o novo saldo total.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tipo === 'ajuste' ? 'Novo Saldo' : 'Quantidade'}
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Motivo da movimentação..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !quantidade || parseFloat(quantidade) <= 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
          >
            {isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EstoquePage() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('')
  const [modalProduto, setModalProduto] = useState<{ id: string; nome: string } | null>(null)
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
    mutationFn: (id: string) => produtosApi.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] })
      setConfirmExcluir(null)
    },
    onError: (e: Error) => alert('Erro ao excluir: ' + e.message),
  })

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos', 'estoque', filtro],
    queryFn: () => produtosApi.listar({
      ativo: true,
      estoque_baixo: filtro === 'baixo',
    }),
  })

  return (
    <div className="space-y-5">
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Excluir produto?</p>
                <p className="text-sm text-gray-500">{confirmExcluir.nome}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              O produto será removido permanentemente. Produtos com vendas registradas não podem ser excluídos.
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

      {modalProduto && (
        <ModalMovimentacao
          produtoId={modalProduto.id}
          nomeProduto={modalProduto.nome}
          onClose={() => setModalProduto(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500">{produtos?.length ?? 0} produtos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['', 'baixo'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              filtro === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {f === '' ? 'Todos' : 'Estoque Baixo'}
            {f === 'baixo' && <AlertTriangle className="inline w-3 h-3 ml-1" />}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Produto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Preço Venda</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Custo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Estoque Atual</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Mínimo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : (produtos ?? []).length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum produto</td></tr>
            ) : (
              (produtos ?? []).map((p) => {
                const qtd = p.estoque?.quantidade_atual ?? 0
                const baixo = qtd <= p.estoque_minimo
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {p.nome}
                      {p.codigo_barras && (
                        <span className="ml-2 text-xs text-gray-400">{p.codigo_barras}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.categorias_produto?.nome ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatarMoeda(p.preco_venda)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatarMoeda(p.custo)}</td>
                    <td className={cn('px-4 py-3 text-right font-semibold', baixo ? 'text-red-600' : 'text-gray-900')}>
                      {qtd} {p.unidade_medida}
                      {baixo && <AlertTriangle className="inline w-3.5 h-3.5 ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{p.estoque_minimo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModalProduto({ id: p.id, nome: p.nome })}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Movimentar
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmExcluir({ id: p.id, nome: p.nome })}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </div>
  )
}
