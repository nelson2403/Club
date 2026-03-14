// Tipos gerados manualmente - espelham o schema do Supabase
// Em produção: usar `supabase gen types typescript`

export type TipoUsuario = 'admin' | 'gerente' | 'caixa' | 'master' | 'administrador' | 'operador'
export type StatusSocio = 'ativo' | 'inativo' | 'bloqueado'
export type StatusPlano = 'ativo' | 'inativo' | 'cancelado'
export type StatusMensalidade = 'pendente' | 'pago' | 'vencido' | 'cancelado'
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia'
export type TipoCobranca = 'manual' | 'whatsapp' | 'email' | 'sistema'
export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste'
export type TipoFinanceiro = 'receita' | 'despesa'
export type OrigemFinanceiro = 'mensalidade' | 'venda' | 'despesa' | 'outro'
export type StatusVenda = 'aberta' | 'finalizada' | 'cancelada'
export type StatusCaixa = 'aberto' | 'fechado'
export type TipoMovCaixa = 'entrada' | 'saida' | 'sangria' | 'suprimento'

// ============================================================
// INTERFACES PRINCIPAIS
// ============================================================

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  ativo: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Plano {
  id: string
  nome_plano: string
  valor_mensalidade: number
  dia_vencimento: number
  descricao?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Socio {
  id: string
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  data_nascimento?: string
  data_cadastro: string
  status: StatusSocio
  foto_url?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface SocioPlano {
  id: string
  socio_id: string
  plano_id: string
  data_inicio: string
  data_fim?: string
  status: StatusPlano
  created_at: string
  updated_at: string
  // joins
  socios?: Socio
  planos?: Plano
}

export interface Mensalidade {
  id: string
  socio_id: string
  plano_id: string
  valor: number
  data_vencimento: string
  data_pagamento?: string
  status: StatusMensalidade
  forma_pagamento?: FormaPagamento
  valor_pago?: number
  desconto: number
  multa: number
  juros: number
  usuario_baixa?: string
  observacao?: string
  referencia_mes: number
  created_at: string
  updated_at: string
  // joins
  socios?: Socio
  planos?: Plano
}

export interface HistoricoCobranca {
  id: string
  mensalidade_id: string
  data_cobranca: string
  tipo_cobranca: TipoCobranca
  status: string
  observacao?: string
  usuario_id?: string
  created_at: string
}

// ============================================================
// MÓDULO BAR / ESTOQUE
// ============================================================

export interface CategoriaProduto {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  created_at: string
}

export interface Produto {
  id: string
  nome: string
  categoria_id?: string
  preco_venda: number
  custo: number
  codigo_barras?: string
  estoque_minimo: number
  unidade_medida: string
  descricao?: string
  foto_url?: string
  ativo: boolean
  created_at: string
  updated_at: string
  // joins
  categorias_produto?: CategoriaProduto
  estoque?: Estoque
}

export interface Estoque {
  id: string
  produto_id: string
  quantidade_atual: number
  ultima_atualizacao: string
}

export interface MovimentacaoEstoque {
  id: string
  produto_id: string
  tipo: TipoMovimentacao
  quantidade: number
  saldo_antes: number
  saldo_depois: number
  usuario_id?: string
  referencia?: string
  data: string
  observacao?: string
  created_at: string
  // joins
  produtos?: Produto
  usuarios?: Usuario
}

// ============================================================
// MÓDULO PDV / CAIXA
// ============================================================

export interface Caixa {
  id: string
  data_abertura: string
  data_fechamento?: string
  usuario_abertura: string
  usuario_fechamento?: string
  valor_inicial: number
  valor_final?: number
  valor_esperado?: number
  diferenca?: number
  status: StatusCaixa
  observacao?: string
  created_at: string
  updated_at: string
  // joins
  usuarios_abertura?: Usuario
}

export interface MovimentacaoCaixa {
  id: string
  caixa_id: string
  tipo: TipoMovCaixa
  descricao: string
  valor: number
  usuario_id?: string
  venda_id?: string
  data: string
  created_at: string
}

export interface Venda {
  id: string
  numero_venda: number
  data_venda: string
  usuario_id: string
  socio_id?: string
  caixa_id?: string
  valor_subtotal: number
  desconto: number
  valor_total: number
  valor_recebido?: number
  troco?: number
  forma_pagamento: FormaPagamento
  status: StatusVenda
  observacao?: string
  created_at: string
  updated_at: string
  // joins
  usuarios?: Usuario
  socios?: Socio
  itens_venda?: ItemVenda[]
}

export interface ItemVenda {
  id: string
  venda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
  created_at: string
  // joins
  produtos?: Produto
}

// ============================================================
// FINANCEIRO
// ============================================================

export interface CategoriaFinanceira {
  id: string
  nome: string
  tipo: TipoFinanceiro
  descricao?: string
  ativo: boolean
  created_at: string
}

export interface MovimentacaoFinanceira {
  id: string
  categoria_id?: string
  descricao: string
  valor: number
  tipo: TipoFinanceiro
  data: string
  origem: OrigemFinanceiro
  referencia_id?: string
  usuario_id?: string
  observacao?: string
  created_at: string
  updated_at: string
  // joins
  categorias_financeiras?: CategoriaFinanceira
}

// ============================================================
// VIEWS
// ============================================================

export interface VwInadimplente {
  socio_id: string
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  status_socio: StatusSocio
  total_mensalidades_abertas: number
  valor_total_devido: number
  vencimento_mais_antigo: string
  vencimento_mais_recente: string
  dias_inadimplente: number
}

export interface VwEstoqueBaixo {
  id: string
  nome: string
  codigo_barras?: string
  categoria: string
  quantidade_atual: number
  estoque_minimo: number
  deficit: number
  ultima_atualizacao: string
}

export interface VwProdutoMaisVendido {
  id: string
  nome: string
  categoria: string
  total_quantidade: number
  total_faturado: number
  total_vendas: number
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardMetricas {
  total_socios: number
  socios_ativos: number
  socios_inadimplentes: number
  mensalidades_pendentes: number
  faturamento_mensalidades_mes: number
  vendas_bar_mes: number
  produtos_estoque_baixo: number
  caixa_aberto?: {
    id: string
    data_abertura: string
    valor_inicial: number
  }
  gerado_em: string
}

// ============================================================
// PDV — Carrinho local (não persiste no banco)
// ============================================================

export interface ItemCarrinho {
  produto: Produto
  quantidade: number
  preco_unitario: number
  subtotal: number
}

// ============================================================
// DEPENDENTES
// ============================================================

export interface Dependente {
  id: string
  socio_id: string
  nome: string
  data_nascimento?: string
  grau_parentesco: string
  cpf?: string
  foto_url?: string
  ativo: boolean
  created_at: string
  updated_at: string
  // joins
  socios?: Socio
}

// ============================================================
// CONTROLE DE ACESSO
// ============================================================

export interface AcessoBiometria {
  id: string
  socio_id?: string
  dependente_id?: string
  tipo: 'biometria' | 'codigo' | 'cartao'
  codigo?: string
  descricao?: string
  ativo: boolean
  created_at: string
  // joins
  socios?: Pick<Socio, 'id' | 'nome'>
  dependentes?: Pick<Dependente, 'id' | 'nome' | 'grau_parentesco'>
}

export interface RegistroAcesso {
  id: string
  socio_id?: string
  dependente_id?: string
  data_hora: string
  tipo: 'entrada' | 'saida'
  liberado: boolean
  motivo_bloqueio?: string
  terminal?: string
  usuario_id?: string
  created_at: string
  // joins
  socios?: Pick<Socio, 'id' | 'nome' | 'status'>
  dependentes?: Pick<Dependente, 'id' | 'nome' | 'grau_parentesco'>
}
