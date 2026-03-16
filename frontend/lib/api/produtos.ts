import { createClient } from '@/lib/supabase/client'
import type { Produto, TipoMovimentacao } from '@/types/database'

const supabase = createClient()

export const produtosApi = {
  listar: async (filtros?: {
    ativo?: boolean
    categoria_id?: string
    busca?: string
    estoque_baixo?: boolean
  }) => {
    let query = supabase
      .from('produtos')
      .select(`
        *,
        categorias_produto(id, nome),
        estoque(quantidade_atual, ultima_atualizacao)
      `)

    if (filtros?.ativo !== undefined) query = query.eq('ativo', filtros.ativo)
    if (filtros?.categoria_id) query = query.eq('categoria_id', filtros.categoria_id)
    if (filtros?.busca) {
      query = query.or(
        `nome.ilike.%${filtros.busca}%,codigo_barras.eq.${filtros.busca}`
      )
    }

    const { data, error } = await query.order('nome')
    if (error) throw error

    let resultado = data ?? []

    // Filtrar estoque baixo no cliente (join calculado)
    if (filtros?.estoque_baixo) {
      resultado = resultado.filter(
        (p) => (p.estoque?.quantidade_atual ?? 0) <= p.estoque_minimo
      )
    }

    return resultado
  },

  buscarPorCodigoBarras: async (codigo: string) => {
    const { data, error } = await supabase
      .from('produtos')
      .select(`
        *,
        categorias_produto(nome),
        estoque(quantidade_atual)
      `)
      .eq('codigo_barras', codigo)
      .eq('ativo', true)
      .single()

    if (error) return null
    return data
  },

  criar: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at' | 'categorias_produto' | 'estoque'>) => {
    const { data, error } = await supabase
      .from('produtos')
      .insert(produto)
      .select()
      .single()

    if (error) throw error
    return data
  },

  atualizar: async (id: string, produto: Partial<Produto>) => {
    const { data, error } = await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  excluir: async (id: string) => {
    // Verificar se há vendas registradas (não pode excluir)
    const { count } = await supabase
      .from('itens_venda')
      .select('id', { count: 'exact', head: true })
      .eq('produto_id', id)

    if ((count ?? 0) > 0) {
      throw new Error('Produto possui vendas registradas e não pode ser excluído.')
    }

    // Remover movimentações de estoque
    await supabase.from('movimentacoes_estoque').delete().eq('produto_id', id)

    // Remover registro de estoque
    await supabase.from('estoque').delete().eq('produto_id', id)

    // Excluir produto
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
  },

  movimentarEstoque: async (
    produto_id: string,
    tipo: TipoMovimentacao,
    quantidade: number,
    observacao?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('fn_movimentar_estoque', {
      p_produto_id: produto_id,
      p_tipo: tipo,
      p_quantidade: quantidade,
      p_usuario_id: user?.id,
      p_observacao: observacao,
    })

    if (error) throw error
    return data
  },

  historicoEstoque: async (produto_id: string) => {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select(`*, usuarios(nome)`)
      .eq('produto_id', produto_id)
      .order('data', { ascending: false })
      .limit(50)

    if (error) throw error
    return data ?? []
  },

  alertasEstoque: async () => {
    const { data, error } = await supabase
      .from('vw_estoque_baixo')
      .select('*')

    if (error) throw error
    return data ?? []
  },
}
