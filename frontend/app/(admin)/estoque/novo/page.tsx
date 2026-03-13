'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ArrowLeft, Package, DollarSign, Barcode, Boxes } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()
const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'
const selectCls = cn(inputCls, 'cursor-pointer')

function Campo({ label, error, obrigatorio, children }: { label: string; error?: string; obrigatorio?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Secao({ titulo, icone: Icon, children }: { titulo: string; icone: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{titulo}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function NovoProdutoPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', categoria_id: '', preco_venda: '', custo: '',
    codigo_barras: '', estoque_minimo: '0', unidade_medida: 'un',
    descricao: '', ativo: true, quantidade_inicial: '0',
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categorias_produto').select('id, nome').eq('ativo', true).order('nome')
      return data ?? []
    },
  })

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.preco_venda) { setErro('Nome e preço de venda são obrigatórios'); return }
    setIsPending(true); setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: produto, error: errProd } = await supabase.from('produtos').insert({
        nome: form.nome,
        categoria_id: form.categoria_id || null,
        preco_venda: parseFloat(form.preco_venda),
        custo: parseFloat(form.custo) || 0,
        codigo_barras: form.codigo_barras || null,
        estoque_minimo: parseFloat(form.estoque_minimo) || 0,
        unidade_medida: form.unidade_medida,
        descricao: form.descricao || null,
        ativo: form.ativo,
      }).select().single()

      if (errProd) throw errProd

      const qtdInicial = parseFloat(form.quantidade_inicial) || 0

      const { error: errEstoque } = await supabase.from('estoque').insert({
        produto_id: produto.id,
        quantidade_atual: qtdInicial,
      })
      if (errEstoque) throw errEstoque

      if (qtdInicial > 0) {
        await supabase.from('movimentacoes_estoque').insert({
          produto_id: produto.id,
          tipo: 'entrada',
          quantidade: qtdInicial,
          saldo_antes: 0,
          saldo_depois: qtdInicial,
          usuario_id: user?.id,
          referencia: 'Estoque inicial',
          observacao: 'Cadastro do produto',
        })
      }

      router.push('/estoque')
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/estoque" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Novo Produto</h1>
          <p className="text-sm text-slate-500">Cadastre um produto para o bar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Secao titulo="Informações do Produto" icone={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Campo label="Nome do produto" obrigatorio>
                <input value={form.nome} onChange={e => set('nome', e.target.value)} className={inputCls} placeholder="Ex: Cerveja Heineken 600ml" autoFocus />
              </Campo>
            </div>
            <Campo label="Categoria">
              <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} className={selectCls}>
                <option value="">Sem categoria</option>
                {(categorias ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Unidade de Medida">
              <select value={form.unidade_medida} onChange={e => set('unidade_medida', e.target.value)} className={selectCls}>
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="litro">Litro</option>
                <option value="cx">Caixa (cx)</option>
                <option value="pct">Pacote (pct)</option>
                <option value="lata">Lata</option>
                <option value="garrafa">Garrafa</option>
              </select>
            </Campo>
            <div className="md:col-span-2">
              <Campo label="Descrição">
                <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} className={inputCls} placeholder="Descrição opcional..." />
              </Campo>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('ativo', !form.ativo)}
                className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', form.ativo ? 'bg-blue-600' : 'bg-slate-200')}>
                <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm mt-1 transition-transform', form.ativo ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <span className="text-sm text-slate-600">{form.ativo ? 'Produto ativo (visível no PDV)' : 'Produto inativo'}</span>
            </div>
          </div>
        </Secao>

        <Secao titulo="Preços" icone={DollarSign}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Preço de Venda (R$)" obrigatorio>
              <input type="number" step="0.01" value={form.preco_venda} onChange={e => set('preco_venda', e.target.value)} className={inputCls} placeholder="0,00" />
            </Campo>
            <Campo label="Custo (R$)">
              <input type="number" step="0.01" value={form.custo} onChange={e => set('custo', e.target.value)} className={inputCls} placeholder="0,00" />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Código & Estoque" icone={Barcode}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Campo label="Código de Barras">
                <input value={form.codigo_barras} onChange={e => set('codigo_barras', e.target.value)} className={inputCls} placeholder="EAN-13 ou código interno" />
              </Campo>
            </div>
            <Campo label="Estoque Mínimo">
              <input type="number" step="0.001" value={form.estoque_minimo} onChange={e => set('estoque_minimo', e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Quantidade Inicial (entrada no estoque)">
              <input type="number" step="0.001" value={form.quantidade_inicial} onChange={e => set('quantidade_inicial', e.target.value)} className={inputCls} />
            </Campo>
          </div>
        </Secao>

        {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{erro}</div>}

        <div className="flex justify-end gap-3 pb-6">
          <Link href="/estoque" className="px-5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">Cancelar</Link>
          <button type="submit" disabled={isPending}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 shadow-sm">
            {isPending ? 'Cadastrando...' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </div>
  )
}
