import { createClient } from '@/lib/supabase/client'
import type { TipoMovCaixa } from '@/types/database'

const supabase = createClient()

export const caixaApi = {
  abrir: async (valor_inicial: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // Verificar se já tem caixa aberto
    const { data: jaAberto } = await supabase
      .from('caixas')
      .select('id')
      .eq('status', 'aberto')
      .single()

    if (jaAberto) throw new Error('Já existe um caixa aberto')

    const { data, error } = await supabase
      .from('caixas')
      .insert({ usuario_abertura: user.id, valor_inicial })
      .select()
      .single()

    if (error) throw error
    return data
  },

  fechar: async (caixa_id: string, valor_final: number, observacao?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase.rpc('fn_fechar_caixa', {
      p_caixa_id: caixa_id,
      p_usuario_id: user.id,
      p_valor_final: valor_final,
      p_observacao: observacao,
    })

    if (error) throw error
    return data
  },

  caixaAtual: async () => {
    const { data, error } = await supabase
      .from('caixas')
      .select(`*, usuarios_abertura:usuario_abertura(nome)`)
      .eq('status', 'aberto')
      .order('data_abertura', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  },

  movimentacoes: async (caixa_id: string) => {
    const { data, error } = await supabase
      .from('movimentacoes_caixa')
      .select(`*, usuarios(nome)`)
      .eq('caixa_id', caixa_id)
      .order('data', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  registrarMovimentacao: async (
    caixa_id: string,
    tipo: TipoMovCaixa,
    descricao: string,
    valor: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('movimentacoes_caixa')
      .insert({ caixa_id, tipo, descricao, valor, usuario_id: user?.id })
      .select()
      .single()

    if (error) throw error
    return data
  },

  historico: async (limit = 30) => {
    const { data, error } = await supabase
      .from('caixas')
      .select(`
        *,
        usuario_abertura_rel:usuario_abertura(nome),
        usuario_fechamento_rel:usuario_fechamento(nome)
      `)
      .order('data_abertura', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ?? []
  },
}
