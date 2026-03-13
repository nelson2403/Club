-- ============================================================
-- Migration 002: Índices de Performance
-- ============================================================

-- ========================
-- SÓCIOS
-- ========================
CREATE INDEX IF NOT EXISTS idx_socios_status        ON socios(status);
CREATE INDEX IF NOT EXISTS idx_socios_cpf           ON socios(cpf);
CREATE INDEX IF NOT EXISTS idx_socios_nome          ON socios USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_socios_email         ON socios(email);
CREATE INDEX IF NOT EXISTS idx_socios_data_cadastro ON socios(data_cadastro);

-- ========================
-- SÓCIOS × PLANOS
-- ========================
CREATE INDEX IF NOT EXISTS idx_socios_planos_socio  ON socios_planos(socio_id);
CREATE INDEX IF NOT EXISTS idx_socios_planos_plano  ON socios_planos(plano_id);
CREATE INDEX IF NOT EXISTS idx_socios_planos_status ON socios_planos(status);

-- ========================
-- MENSALIDADES
-- ========================
CREATE INDEX IF NOT EXISTS idx_mensalidades_socio      ON mensalidades(socio_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_plano      ON mensalidades(plano_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_status     ON mensalidades(status);
CREATE INDEX IF NOT EXISTS idx_mensalidades_vencimento ON mensalidades(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_mensalidades_referencia ON mensalidades(referencia_mes);
-- Índice composto para consultas de inadimplência
CREATE INDEX IF NOT EXISTS idx_mensalidades_inadimplencia
    ON mensalidades(status, data_vencimento)
    WHERE status IN ('pendente', 'vencido');

-- ========================
-- PRODUTOS
-- ========================
CREATE INDEX IF NOT EXISTS idx_produtos_categoria     ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo         ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_nome          ON produtos USING gin(to_tsvector('portuguese', nome));

-- ========================
-- ESTOQUE
-- ========================
CREATE INDEX IF NOT EXISTS idx_estoque_produto    ON estoque(produto_id);
-- Índice parcial para alertas de estoque mínimo
CREATE INDEX IF NOT EXISTS idx_estoque_minimo
    ON estoque(produto_id, quantidade_atual)
    WHERE quantidade_atual <= 5; -- ajustar conforme necessidade

-- ========================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ========================
CREATE INDEX IF NOT EXISTS idx_mov_estoque_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_data    ON movimentacoes_estoque(data);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_usuario ON movimentacoes_estoque(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_tipo    ON movimentacoes_estoque(tipo);

-- ========================
-- VENDAS
-- ========================
CREATE INDEX IF NOT EXISTS idx_vendas_data       ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_usuario    ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_socio      ON vendas(socio_id);
CREATE INDEX IF NOT EXISTS idx_vendas_caixa      ON vendas(caixa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status     ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_numero     ON vendas(numero_venda);
-- Composto para relatórios por período
CREATE INDEX IF NOT EXISTS idx_vendas_data_status ON vendas(data_venda, status);

-- ========================
-- ITENS DA VENDA
-- ========================
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda   ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto ON itens_venda(produto_id);

-- ========================
-- CAIXAS
-- ========================
CREATE INDEX IF NOT EXISTS idx_caixas_status     ON caixas(status);
CREATE INDEX IF NOT EXISTS idx_caixas_abertura   ON caixas(data_abertura);
CREATE INDEX IF NOT EXISTS idx_caixas_usuario    ON caixas(usuario_abertura);

-- ========================
-- MOVIMENTAÇÕES CAIXA
-- ========================
CREATE INDEX IF NOT EXISTS idx_mov_caixa_caixa   ON movimentacoes_caixa(caixa_id);
CREATE INDEX IF NOT EXISTS idx_mov_caixa_data    ON movimentacoes_caixa(data);
CREATE INDEX IF NOT EXISTS idx_mov_caixa_tipo    ON movimentacoes_caixa(tipo);

-- ========================
-- FINANCEIRO
-- ========================
CREATE INDEX IF NOT EXISTS idx_mov_financeiras_data      ON movimentacoes_financeiras(data);
CREATE INDEX IF NOT EXISTS idx_mov_financeiras_tipo      ON movimentacoes_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_mov_financeiras_origem    ON movimentacoes_financeiras(origem);
CREATE INDEX IF NOT EXISTS idx_mov_financeiras_categoria ON movimentacoes_financeiras(categoria_id);
CREATE INDEX IF NOT EXISTS idx_mov_financeiras_referencia ON movimentacoes_financeiras(referencia_id);

-- ========================
-- LOGS
-- ========================
CREATE INDEX IF NOT EXISTS idx_logs_usuario    ON logs_atividade(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_tabela     ON logs_atividade(tabela);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs_atividade(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_acao       ON logs_atividade(acao);

-- ========================
-- HISTÓRICO COBRANÇAS
-- ========================
CREATE INDEX IF NOT EXISTS idx_hist_cob_mensalidade ON historico_cobrancas(mensalidade_id);
CREATE INDEX IF NOT EXISTS idx_hist_cob_data        ON historico_cobrancas(data_cobranca);
CREATE INDEX IF NOT EXISTS idx_hist_cob_tipo        ON historico_cobrancas(tipo_cobranca);
