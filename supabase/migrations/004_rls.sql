-- ============================================================
-- Migration 004: Row Level Security (RLS)
-- ============================================================

-- ============================================================
-- FUNÇÃO AUXILIAR: Retorna o tipo do usuário autenticado
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_user_role()
RETURNS tipo_usuario_enum AS $$
    SELECT tipo_usuario FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid() AND tipo_usuario = 'admin' AND ativo = TRUE
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_is_admin_or_gerente()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid()
          AND tipo_usuario IN ('admin', 'gerente')
          AND ativo = TRUE
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_is_authenticated()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid() AND ativo = TRUE
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- HABILITAR RLS em todas as tabelas
-- ============================================================
ALTER TABLE usuarios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE socios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE socios_planos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensalidades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_cobrancas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_produto        ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_atividade            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABELA: usuarios
-- ============================================================

-- Qualquer usuário autenticado pode ver a própria linha
CREATE POLICY pol_usuarios_select_self ON usuarios
    FOR SELECT USING (id = auth.uid() OR fn_is_admin_or_gerente());

-- Só admin pode ver e alterar todos os usuários
CREATE POLICY pol_usuarios_insert ON usuarios
    FOR INSERT WITH CHECK (fn_is_admin());

CREATE POLICY pol_usuarios_update ON usuarios
    FOR UPDATE USING (id = auth.uid() OR fn_is_admin());

CREATE POLICY pol_usuarios_delete ON usuarios
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: planos
-- ============================================================
CREATE POLICY pol_planos_select ON planos
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_planos_insert ON planos
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_planos_update ON planos
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_planos_delete ON planos
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: socios
-- ============================================================
CREATE POLICY pol_socios_select ON socios
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_socios_insert ON socios
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_socios_update ON socios
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_socios_delete ON socios
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: socios_planos
-- ============================================================
CREATE POLICY pol_socios_planos_select ON socios_planos
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_socios_planos_insert ON socios_planos
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_socios_planos_update ON socios_planos
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_socios_planos_delete ON socios_planos
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: mensalidades
-- ============================================================
CREATE POLICY pol_mensalidades_select ON mensalidades
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_mensalidades_insert ON mensalidades
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_mensalidades_update ON mensalidades
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_mensalidades_delete ON mensalidades
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: historico_cobrancas
-- ============================================================
CREATE POLICY pol_hist_cob_select ON historico_cobrancas
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_hist_cob_insert ON historico_cobrancas
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_hist_cob_update ON historico_cobrancas
    FOR UPDATE USING (fn_is_admin_or_gerente());

-- ============================================================
-- TABELA: categorias_produto
-- ============================================================
CREATE POLICY pol_cat_produto_select ON categorias_produto
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_cat_produto_insert ON categorias_produto
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_cat_produto_update ON categorias_produto
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_cat_produto_delete ON categorias_produto
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: produtos
-- ============================================================
CREATE POLICY pol_produtos_select ON produtos
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_produtos_insert ON produtos
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_produtos_update ON produtos
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_produtos_delete ON produtos
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: estoque
-- ============================================================
CREATE POLICY pol_estoque_select ON estoque
    FOR SELECT USING (fn_is_authenticated());

-- Estoque é gerenciado apenas por funções internas (SECURITY DEFINER)
CREATE POLICY pol_estoque_update ON estoque
    FOR UPDATE USING (fn_is_admin_or_gerente());

-- ============================================================
-- TABELA: movimentacoes_estoque
-- ============================================================
CREATE POLICY pol_mov_estoque_select ON movimentacoes_estoque
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_mov_estoque_insert ON movimentacoes_estoque
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

-- ============================================================
-- TABELA: caixas
-- ============================================================
CREATE POLICY pol_caixas_select ON caixas
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_caixas_insert ON caixas
    FOR INSERT WITH CHECK (fn_is_authenticated()); -- qualquer usuário pode abrir caixa

CREATE POLICY pol_caixas_update ON caixas
    FOR UPDATE USING (
        usuario_abertura = auth.uid() OR fn_is_admin_or_gerente()
    );

-- ============================================================
-- TABELA: movimentacoes_caixa
-- ============================================================
CREATE POLICY pol_mov_caixa_select ON movimentacoes_caixa
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_mov_caixa_insert ON movimentacoes_caixa
    FOR INSERT WITH CHECK (fn_is_authenticated());

-- Só admin pode deletar sangrias/suprimentos
CREATE POLICY pol_mov_caixa_delete ON movimentacoes_caixa
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: vendas
-- ============================================================
CREATE POLICY pol_vendas_select ON vendas
    FOR SELECT USING (fn_is_authenticated());

-- Qualquer autenticado pode criar venda (caixa PDV)
CREATE POLICY pol_vendas_insert ON vendas
    FOR INSERT WITH CHECK (fn_is_authenticated());

-- Vendedor pode atualizar a própria venda aberta; admin pode tudo
CREATE POLICY pol_vendas_update ON vendas
    FOR UPDATE USING (
        (usuario_id = auth.uid() AND status = 'aberta')
        OR fn_is_admin_or_gerente()
    );

-- ============================================================
-- TABELA: itens_venda
-- ============================================================
CREATE POLICY pol_itens_venda_select ON itens_venda
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_itens_venda_insert ON itens_venda
    FOR INSERT WITH CHECK (fn_is_authenticated());

CREATE POLICY pol_itens_venda_update ON itens_venda
    FOR UPDATE USING (fn_is_authenticated());

CREATE POLICY pol_itens_venda_delete ON itens_venda
    FOR DELETE USING (fn_is_authenticated());

-- ============================================================
-- TABELA: categorias_financeiras
-- ============================================================
CREATE POLICY pol_cat_fin_select ON categorias_financeiras
    FOR SELECT USING (fn_is_authenticated());

CREATE POLICY pol_cat_fin_insert ON categorias_financeiras
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_cat_fin_update ON categorias_financeiras
    FOR UPDATE USING (fn_is_admin_or_gerente());

CREATE POLICY pol_cat_fin_delete ON categorias_financeiras
    FOR DELETE USING (fn_is_admin());

-- ============================================================
-- TABELA: movimentacoes_financeiras
-- ============================================================
CREATE POLICY pol_mov_fin_select ON movimentacoes_financeiras
    FOR SELECT USING (fn_is_admin_or_gerente());

CREATE POLICY pol_mov_fin_insert ON movimentacoes_financeiras
    FOR INSERT WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY pol_mov_fin_update ON movimentacoes_financeiras
    FOR UPDATE USING (fn_is_admin());

-- ============================================================
-- TABELA: logs_atividade
-- ============================================================

-- Somente admin visualiza logs
CREATE POLICY pol_logs_select ON logs_atividade
    FOR SELECT USING (fn_is_admin());

-- Sistema insere logs (via SECURITY DEFINER functions)
CREATE POLICY pol_logs_insert ON logs_atividade
    FOR INSERT WITH CHECK (TRUE); -- controlado pelas funções

-- ============================================================
-- GRANT de permissões para o role anon e authenticated
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Views
GRANT SELECT ON vw_estoque_baixo TO authenticated;
GRANT SELECT ON vw_inadimplentes TO authenticated;
GRANT SELECT ON vw_vendas_resumo_diario TO authenticated;
GRANT SELECT ON vw_produtos_mais_vendidos TO authenticated;
