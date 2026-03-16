import { createClient } from '@/lib/supabase/client'
import type { Socio } from '@/types/database'

const supabase = createClient()

export const sociosApi = {
  listar: async (filtros?: {
    status?: string
    busca?: string
    page?: number
    limit?: number
  }) => {
    let query = supabase
      .from('socios')
      .select(`
        *,
        socios_planos(
          id, status, data_inicio, data_fim,
          planos(nome_plano, valor_mensalidade)
        )
      `, { count: 'exact' })

    if (filtros?.status) query = query.eq('status', filtros.status)
    if (filtros?.busca) {
      query = query.or(
        `nome.ilike.%${filtros.busca}%,cpf.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%`
      )
    }

    const page = filtros?.page ?? 1
    const limit = filtros?.limit ?? 20
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('nome')

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
  },

  buscarPorId: async (id: string) => {
    const { data, error } = await supabase
      .from('socios')
      .select(`
        *,
        socios_planos(
          *, planos(*)
        ),
        mensalidades(
          id, valor, data_vencimento, status, referencia_mes
          order: data_vencimento.desc
          limit: 12
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  criar: async (socio: Omit<Socio, 'id' | 'created_at' | 'updated_at' | 'data_cadastro'>) => {
    const { data, error } = await supabase
      .from('socios')
      .insert(socio)
      .select()
      .single()

    if (error) throw error
    return data
  },

  atualizar: async (id: string, socio: Partial<Socio>) => {
    const { data, error } = await supabase
      .from('socios')
      .update(socio)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  alterarStatus: async (id: string, status: Socio['status']) => {
    const { data, error } = await supabase
      .from('socios')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  excluir: async (id: string) => {
    const { error } = await supabase
      .from('socios')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  atribuirPlano: async (socio_id: string, plano_id: string) => {
    // Desativar plano atual
    await supabase
      .from('socios_planos')
      .update({ status: 'inativo', data_fim: new Date().toISOString().split('T')[0] })
      .eq('socio_id', socio_id)
      .eq('status', 'ativo')

    // Inserir novo plano
    const { data, error } = await supabase
      .from('socios_planos')
      .insert({ socio_id, plano_id, status: 'ativo' })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
