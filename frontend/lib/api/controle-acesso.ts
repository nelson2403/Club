import { createClient } from '@/lib/supabase/client'
import type { AcessoBiometria, RegistroAcesso } from '@/types/database'

const supabase = createClient()

export const controleAcessoApi = {
  // ——————————————————————————
  // Biometrias / Códigos
  // ——————————————————————————
  async listarBiometrias(filtros?: { socio_id?: string; dependente_id?: string }): Promise<AcessoBiometria[]> {
    let q = supabase
      .from('acessos_biometria')
      .select('*, socios(id, nome), dependentes(id, nome, grau_parentesco)')
      .eq('ativo', true)
      .order('created_at', { ascending: false })

    if (filtros?.socio_id)      q = q.eq('socio_id', filtros.socio_id)
    if (filtros?.dependente_id) q = q.eq('dependente_id', filtros.dependente_id)

    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async criarBiometria(dados: Pick<AcessoBiometria, 'socio_id' | 'dependente_id' | 'tipo' | 'codigo' | 'descricao'>): Promise<AcessoBiometria> {
    const { data, error } = await supabase
      .from('acessos_biometria')
      .insert({ ...dados, ativo: true })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removerBiometria(id: string): Promise<void> {
    const { error } = await supabase
      .from('acessos_biometria')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
  },

  // ——————————————————————————
  // Registros de Acesso
  // ——————————————————————————
  async listarRegistros(filtros?: {
    socio_id?: string
    tipo?: 'entrada' | 'saida'
    liberado?: boolean
    data_inicio?: string
    data_fim?: string
    limite?: number
  }): Promise<RegistroAcesso[]> {
    let q = supabase
      .from('registros_acesso')
      .select('*, socios(id, nome, status), dependentes(id, nome, grau_parentesco)')
      .order('data_hora', { ascending: false })
      .limit(filtros?.limite ?? 100)

    if (filtros?.socio_id)   q = q.eq('socio_id', filtros.socio_id)
    if (filtros?.tipo)       q = q.eq('tipo', filtros.tipo)
    if (filtros?.liberado !== undefined) q = q.eq('liberado', filtros.liberado)
    if (filtros?.data_inicio) q = q.gte('data_hora', filtros.data_inicio)
    if (filtros?.data_fim)    q = q.lte('data_hora', filtros.data_fim)

    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async registrarAcesso(dados: {
    socio_id?: string
    dependente_id?: string
    tipo: 'entrada' | 'saida'
    liberado: boolean
    motivo_bloqueio?: string
    terminal?: string
  }): Promise<RegistroAcesso> {
    const { data, error } = await supabase
      .from('registros_acesso')
      .insert(dados)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async verificarAcesso(params: {
    codigo?: string
    socio_id?: string
    dependente_id?: string
  }): Promise<{ liberado: boolean; nome?: string; motivo?: string; socio_id?: string }> {
    const { data, error } = await supabase.rpc('fn_verificar_acesso', {
      p_codigo:        params.codigo        ?? null,
      p_socio_id:      params.socio_id      ?? null,
      p_dependente_id: params.dependente_id ?? null,
    })
    if (error) throw error
    return data as { liberado: boolean; nome?: string; motivo?: string; socio_id?: string }
  },
}
