'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { produtosApi } from '@/lib/api/produtos'
import { caixaApi } from '@/lib/api/caixa'
import { usePDV } from '@/hooks/usePDV'
import { formatarMoeda, cn } from '@/lib/utils'
import {
  Search, Barcode, Plus, Minus, Trash2, ShoppingCart,
  DollarSign, CreditCard, Smartphone, CheckCircle, X,
  Wallet, LogOut, Clock, Lock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FormaPagamento, Produto } from '@/types/database'

const supabase = createClient()

// ============================================================
// Tela de Abertura de Caixa
// ============================================================
function TelaAbrirCaixa({ onAberto }: { onAberto: () => void }) {
  const qc = useQueryClient()
  const [valorInicial, setValorInicial] = useState('0,00')
  const [erro, setErro] = useState('')
  const router = useRouter()

  const { mutate: abrirCaixa, isPending } = useMutation({
    mutationFn: () => {
      const valor = parseFloat(valorInicial.replace(',', '.')) || 0
      return caixaApi.abrir(valor)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa', 'atual'] })
      onAberto()
    },
    onError: (e: Error) => setErro(e.message),
  })

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Formata o input como moeda enquanto digita
  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const num = parseInt(raw || '0', 10) / 100
    setValorInicial(num.toFixed(2).replace('.', ','))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-green-950 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Abertura de Caixa</h1>
                <p className="text-green-100 text-sm">PDV — Bar do Clube</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5">
            <div>
              <p className="text-gray-600 text-sm">
                Informe o valor em dinheiro disponível no caixa para iniciar as operações do dia.
              </p>
            </div>

            {/* Data e hora atual */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span>
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                })}
              </span>
            </div>

            {/* Valor inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Inicial (troco em caixa)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">
                  R$
                </span>
                <input
                  type="text"
                  value={valorInicial}
                  onChange={handleValorChange}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-2xl
                             font-bold text-right text-gray-900 focus:outline-none
                             focus:border-green-500 transition-colors"
                  placeholder="0,00"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Se não houver troco inicial, deixe como R$ 0,00
              </p>
            </div>

            {erro && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <button
              onClick={() => abrirCaixa()}
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60
                         text-white font-bold py-4 rounded-xl text-base transition-colors"
            >
              {isPending ? 'Abrindo caixa...' : 'Abrir Caixa e Iniciar'}
            </button>

            <button
              onClick={handleSair}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400
                         hover:text-gray-600 transition-colors py-2"
            >
              <LogOut className="w-4 h-4" />
              Sair do sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal de Finalização de Venda
// ============================================================
function ModalFinalizacao({
  valorTotal, onConfirmar, onCancelar, isPending,
}: {
  valorTotal: number
  onConfirmar: (forma: FormaPagamento, valorRecebido?: number, numeroAutorizacao?: string) => void
  onCancelar: () => void
  isPending: boolean
}) {
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [valorRecebido, setValorRecebido] = useState(valorTotal.toFixed(2))
  const [numeroAutorizacao, setNumeroAutorizacao] = useState('')
  const troco = Math.max(0, parseFloat(valorRecebido || '0') - valorTotal)

  const formas = [
    { value: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
    { value: 'pix', label: 'PIX', icon: Smartphone },
    { value: 'cartao_debito', label: 'Débito', icon: CreditCard },
    { value: 'cartao_credito', label: 'Crédito', icon: CreditCard },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Finalizar Venda</h2>
          <button onClick={onCancelar} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Total a pagar</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{formatarMoeda(valorTotal)}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</p>
          <div className="grid grid-cols-4 gap-2">
            {formas.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setForma(value)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-colors',
                  forma === value
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {forma === 'dinheiro' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido</label>
            <input
              type="number" step="0.01" value={valorRecebido}
              onChange={(e) => setValorRecebido(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-semibold
                         text-center focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {troco > 0 && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                <p className="text-sm font-semibold text-green-700">
                  Troco: {formatarMoeda(troco)}
                </p>
              </div>
            )}
          </div>
        )}

        {(forma === 'cartao_debito' || forma === 'cartao_credito') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nº Autorização / NSU
            </label>
            <input
              type="text"
              value={numeroAutorizacao}
              onChange={(e) => setNumeroAutorizacao(e.target.value)}
              placeholder="Ex: 123456"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Número do comprovante da maquininha</p>
          </div>
        )}

        <button
          onClick={() => onConfirmar(forma, forma === 'dinheiro' ? parseFloat(valorRecebido) : undefined, numeroAutorizacao || undefined)}
          disabled={isPending || (forma === 'dinheiro' && parseFloat(valorRecebido) < valorTotal)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold
                     py-3 rounded-xl text-base transition-colors disabled:opacity-50"
        >
          {isPending ? 'Processando...' : 'Confirmar Pagamento'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Modal Fechar Caixa
// ============================================================
function ModalFecharCaixa({
  caixa, onClose, onFechado,
}: {
  caixa: any
  onClose: () => void
  onFechado: () => void
}) {
  const [valorFinal, setValorFinal] = useState('0,00')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  const { mutate: fechar, isPending } = useMutation({
    mutationFn: () => caixaApi.fechar(
      caixa.id,
      parseFloat(valorFinal.replace(',', '.')) || 0,
      observacao || undefined
    ),
    onSuccess: onFechado,
    onError: (e: Error) => setErro(e.message),
  })

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const num = parseInt(raw || '0', 10) / 100
    setValorFinal(num.toFixed(2).replace('.', ','))
  }

  const abertura = caixa?.data_abertura
    ? new Date(caixa.data_abertura).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    : '—'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Fechar Caixa</h2>
              <p className="text-slate-400 text-xs">Aberto em: {abertura}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Valor em dinheiro no caixa (contagem física)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-lg">R$</span>
              <input
                type="text"
                value={valorFinal}
                onChange={handleValorChange}
                inputMode="numeric"
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl text-2xl
                           font-bold text-right focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Diferenças, ocorrências..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {erro && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={() => fechar()} disabled={isPending}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-2.5
                         text-sm font-semibold disabled:opacity-60">
              {isPending ? 'Fechando...' : 'Fechar Caixa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Card de Produto
// ============================================================
function CardProduto({ produto, onAdicionar }: {
  produto: Produto & { estoque?: { quantidade_atual: number } }
  onAdicionar: (produto: Produto) => void
}) {
  const estoque = produto.estoque?.quantidade_atual ?? 0
  const semEstoque = estoque <= 0

  return (
    <button
      onClick={() => !semEstoque && onAdicionar(produto)}
      disabled={semEstoque}
      className={cn(
        'bg-white border rounded-xl p-4 text-left transition-all',
        semEstoque
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-md hover:border-green-300 cursor-pointer active:scale-95'
      )}
    >
      <div className="h-12 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
        <ShoppingCart className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">{produto.nome}</p>
      <p className="text-base font-bold text-green-600 mt-1">{formatarMoeda(produto.preco_venda)}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {semEstoque ? 'Sem estoque' : `${estoque} em estoque`}
      </p>
    </button>
  )
}

// ============================================================
// Tela principal do PDV
// ============================================================
function TelaPDV({ caixa }: { caixa: any }) {
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarFecharCaixa, setMostrarFecharCaixa] = useState(false)
  const [vendaFinalizada, setVendaFinalizada] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)
  const pdv = usePDV()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: produtos } = useQuery({
    queryKey: ['produtos', 'pdv', busca],
    queryFn: () => produtosApi.listar({ ativo: true, busca: busca || undefined }),
  })

  async function handleBuscaBarras(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !busca.trim()) return
    const produto = await produtosApi.buscarPorCodigoBarras(busca.trim())
    if (produto) {
      pdv.adicionarItem(produto)
      setBusca('')
    }
  }

  function handleFinalizarVenda(forma: FormaPagamento, valorRecebido?: number, numeroAutorizacao?: string) {
    pdv.finalizarVenda.mutate(
      { forma_pagamento: forma, valor_recebido: valorRecebido, numero_autorizacao: numeroAutorizacao },
      {
        onSuccess: () => {
          setMostrarModal(false)
          setVendaFinalizada(true)
          setTimeout(() => setVendaFinalizada(false), 3000)
        },
      }
    )
  }

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const produtosFiltrados = (produtos ?? []).filter((p) =>
    categoriaFiltro ? p.categoria_id === categoriaFiltro : true
  )

  const categorias = Array.from(
    new Map(
      (produtos ?? [])
        .filter((p) => p.categorias_produto)
        .map((p) => [p.categorias_produto!.id, p.categorias_produto!])
    ).values()
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {mostrarModal && (
        <ModalFinalizacao
          valorTotal={pdv.valorTotal}
          onConfirmar={handleFinalizarVenda}
          onCancelar={() => setMostrarModal(false)}
          isPending={pdv.finalizarVenda.isPending}
        />
      )}

      {mostrarFecharCaixa && (
        <ModalFecharCaixa
          caixa={caixa}
          onClose={() => setMostrarFecharCaixa(false)}
          onFechado={async () => {
            await qc.invalidateQueries({ queryKey: ['caixa', 'atual'] })
            await handleSair()
          }}
        />
      )}

      {vendaFinalizada && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-green-600 text-white
                        px-5 py-3 rounded-xl shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Venda finalizada com sucesso!</span>
        </div>
      )}

      {/* Painel esquerdo: produtos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">PDV — Bar</p>
              <p className="text-xs text-gray-400">
                {caixa?.data_abertura
                  ? `Caixa aberto às ${new Date(caixa.data_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Caixa aberto'
                }
              </p>
            </div>
          </div>

          <div className="flex-1 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              ref={buscaRef}
              type="text"
              placeholder="Buscar produto ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={handleBuscaBarras}
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setMostrarFecharCaixa(true)}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700
                         border border-red-200 hover:border-red-400 hover:bg-red-50
                         px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <Lock className="w-3.5 h-3.5" />
              Fechar Caixa
            </button>
            <button
              onClick={handleSair}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600
                         border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        {/* Filtro por categoria */}
        <div className="bg-white border-b border-gray-100 px-5 py-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setCategoriaFiltro('')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              !categoriaFiltro ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaFiltro(cat.id === categoriaFiltro ? '' : cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                categoriaFiltro === cat.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.nome}
            </button>
          ))}
        </div>

        {/* Grid de produtos */}
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {produtosFiltrados.map((produto) => (
              <CardProduto
                key={produto.id}
                produto={produto}
                onAdicionar={pdv.adicionarItem}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito: carrinho */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Carrinho</span>
            {pdv.totalItens > 0 && (
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pdv.totalItens}
              </span>
            )}
          </div>
          {pdv.carrinho.length > 0 && (
            <button onClick={pdv.limparCarrinho}
              className="text-xs text-red-500 hover:text-red-700 transition-colors">
              Limpar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto divide-y divide-gray-50">
          {pdv.carrinho.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <ShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Adicione produtos ao carrinho</p>
            </div>
          ) : (
            pdv.carrinho.map((item) => (
              <div key={item.produto.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 flex-1 leading-tight">
                    {item.produto.nome}
                  </p>
                  <button onClick={() => pdv.removerItem(item.produto.id)}
                    className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => pdv.alterarQuantidade(item.produto.id, item.quantidade - 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantidade}</span>
                    <button onClick={() => pdv.alterarQuantidade(item.produto.id, item.quantidade + 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {formatarMoeda(item.subtotal)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatarMoeda(item.preco_unitario)} × {item.quantidade}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 p-5 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatarMoeda(pdv.valorSubtotal)}</span>
            </div>
            {pdv.desconto > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span>- {formatarMoeda(pdv.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{formatarMoeda(pdv.valorTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => setMostrarModal(true)}
            disabled={pdv.carrinho.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold
                       py-3 rounded-xl text-base transition-colors disabled:opacity-40"
          >
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Controlador principal: decide qual tela mostrar
// ============================================================
export default function PDVPage() {
  const qc = useQueryClient()
  const [caixaAcabouDeAbrir, setCaixaAcabouDeAbrir] = useState(false)

  const { data: caixa, isLoading } = useQuery({
    queryKey: ['caixa', 'atual'],
    queryFn: caixaApi.caixaAtual,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-green-950
                      flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
      </div>
    )
  }

  // Se não tem caixa aberto, mostra tela de abertura
  if (!caixa && !caixaAcabouDeAbrir) {
    return (
      <TelaAbrirCaixa
        onAberto={() => {
          setCaixaAcabouDeAbrir(true)
          qc.invalidateQueries({ queryKey: ['caixa', 'atual'] })
        }}
      />
    )
  }

  // Query ainda refazendo após abertura — aguarda
  if (caixaAcabouDeAbrir && !caixa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-green-950
                      flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
      </div>
    )
  }

  // Tem caixa aberto — mostra o PDV
  return <TelaPDV caixa={caixa} />
}
