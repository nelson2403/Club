import { createClient } from '@/lib/supabase/client'
import type { Dependente } from '@/types/database'

const supabase = createClient()

export const dependentesApi = {
  async listarPorSocio(socioId: string): Promise<Dependente[]> {
    const { data, error } = await supabase
      .from('dependentes')
      .select('*')
      .eq('socio_id', socioId)
      .eq('ativo', true)
      .order('nome')
    if (error) throw error
    return data ?? []
  },

  async criar(dados: Omit<Dependente, 'id' | 'created_at' | 'updated_at' | 'ativo'>): Promise<Dependente> {
    const { data, error } = await supabase
      .from('dependentes')
      .insert({ ...dados, ativo: true })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id: string, dados: Partial<Pick<Dependente, 'nome' | 'data_nascimento' | 'grau_parentesco' | 'cpf' | 'foto_url'>>): Promise<void> {
    const { error } = await supabase
      .from('dependentes')
      .update(dados)
      .eq('id', id)
    if (error) throw error
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase
      .from('dependentes')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
  },
}
