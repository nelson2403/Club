-- ============================================================
-- Migration 003: Funções e Triggers
-- ============================================================

-- ============================================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at em todas as tabelas relevantes
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_planos_updated_at
    BEFORE UPDATE ON planos
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_socios_updated_at
    BEFORE UPDATE ON socios
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_socios_planos_updated_at
    BEFORE UPDATE ON socios_planos
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_mensalidades_updated_at
    BEFORE UPDATE ON mensalidades
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_produtos_updated_at
    BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_vendas_updated_at
    BEFORE UPDATE ON vendas
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_caixas_updated_at
    BEFORE UPDATE ON caixas
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_mov_financeiras_updated_at
    BEFORE UPDATE ON movimentacoes_financeiras
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ============================================================
-- FUNÇÃO: Criar perfil de usuário após registro no Auth
-- ============================================================
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, nome, email, tipo_usuario)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'tipo_usuario')::tipo_usuario_enum, 'caixa')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================
-- FUNÇÃO: Movimentar estoque com controle de saldo
-- ============================================================
CREATE OR REPLACE FUNCTION fn_movimentar_estoque(
    p_produto_id   UUID,
    p_tipo         tipo_movimentacao_enum,
    p_quantidade   NUMERIC,
    p_usuario_id   UUID DEFAULT NULL,
    p_referencia   TEXT DEFAULT NULL,
    p_observacao   TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_saldo_atual  NUMERIC;
    v_saldo_novo   NUMERIC;
BEGIN
    -- Buscar saldo atual com lock para evitar race condition
    SELECT quantidade_atual INTO v_saldo_atual
    FROM estoque
    WHERE produto_id = p_produto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % não encontrado no estoque', p_produto_id;
    END IF;

    -- Calcular novo saldo
    IF p_tipo = 'entrada' THEN
        v_saldo_novo := v_saldo_atual + p_quantidade;
    ELSIF p_tipo = 'saida' THEN
        IF v_saldo_atual < p_quantidade THEN
            RAISE EXCEPTION 'Saldo insuficiente. Atual: %, Solicitado: %', v_saldo_atual, p_quantidade;
        END IF;
        v_saldo_novo := v_saldo_atual - p_quantidade;
    ELSIF p_tipo = 'ajuste' THEN
        v_saldo_novo := p_quantidade; -- no ajuste, quantidade é o novo saldo
    END IF;

    -- Atualizar saldo
    UPDATE estoque
    SET quantidade_atual   = v_saldo_novo,
        ultima_atualizacao = NOW()
    WHERE produto_id = p_produto_id;

    -- Registrar movimentação
    INSERT INTO movimentacoes_estoque (
        produto_id, tipo, quantidade, saldo_antes, saldo_depois,
        usuario_id, referencia, observacao
    ) VALUES (
        p_produto_id, p_tipo,
        CASE WHEN p_tipo = 'ajuste' THEN ABS(v_saldo_novo - v_saldo_atual) ELSE p_quantidade END,
        v_saldo_atual, v_saldo_novo,
        p_usuario_id, p_referencia, p_observacao
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Ao inserir produto, criar registro de estoque
-- ============================================================
CREATE OR REPLACE FUNCTION fn_criar_estoque_produto()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO estoque (produto_id, quantidade_atual)
    VALUES (NEW.id, 0)
    ON CONFLICT (produto_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_produto_criar_estoque
    AFTER INSERT ON produtos
    FOR EACH ROW EXECUTE FUNCTION fn_criar_estoque_produto();

-- ============================================================
-- FUNÇÃO: Finalizar venda (atômica - baixa estoque + financeiro + caixa)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_finalizar_venda(
    p_venda_id      UUID,
    p_usuario_id    UUID,
    p_valor_recebido NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_venda         RECORD;
    v_item          RECORD;
    v_caixa_id      UUID;
    v_categoria_id  UUID;
BEGIN
    -- Buscar venda com lock
    SELECT * INTO v_venda
    FROM vendas
    WHERE id = p_venda_id AND status = 'aberta'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda % não encontrada ou já finalizada', p_venda_id;
    END IF;

    -- Verificar caixa aberto
    SELECT id INTO v_caixa_id
    FROM caixas
    WHERE status = 'aberto'
    ORDER BY data_abertura DESC
    LIMIT 1;

    IF v_caixa_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum caixa aberto. Abra o caixa antes de finalizar vendas.';
    END IF;

    -- 1. Baixar estoque de cada item
    FOR v_item IN
        SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = p_venda_id
    LOOP
        PERFORM fn_movimentar_estoque(
            v_item.produto_id,
            'saida',
            v_item.quantidade,
            p_usuario_id,
            'venda:' || p_venda_id,
            'Saída por venda PDV'
        );
    END LOOP;

    -- 2. Atualizar venda como finalizada
    UPDATE vendas SET
        status         = 'finalizada',
        caixa_id       = v_caixa_id,
        valor_recebido = COALESCE(p_valor_recebido, valor_total),
        updated_at     = NOW()
    WHERE id = p_venda_id;

    -- 3. Registrar no caixa
    INSERT INTO movimentacoes_caixa (
        caixa_id, tipo, descricao, valor, usuario_id, venda_id
    ) VALUES (
        v_caixa_id, 'entrada',
        'Venda #' || v_venda.numero_venda,
        v_venda.valor_total,
        p_usuario_id,
        p_venda_id
    );

    -- 4. Buscar categoria financeira "Venda Bar"
    SELECT id INTO v_categoria_id
    FROM categorias_financeiras
    WHERE nome = 'Vendas Bar' AND tipo = 'receita'
    LIMIT 1;

    -- 5. Registrar movimentação financeira
    INSERT INTO movimentacoes_financeiras (
        categoria_id, descricao, valor, tipo, origem, referencia_id, usuario_id
    ) VALUES (
        v_categoria_id,
        'Venda PDV #' || v_venda.numero_venda,
        v_venda.valor_total,
        'receita',
        'venda',
        p_venda_id,
        p_usuario_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'venda_id', p_venda_id,
        'caixa_id', v_caixa_id,
        'valor_total', v_venda.valor_total
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: Gerar mensalidades de um mês para todos sócios ativos
-- ============================================================
CREATE OR REPLACE FUNCTION fn_gerar_mensalidades(
    p_ano  INTEGER,
    p_mes  INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_socio_plano   RECORD;
    v_referencia    INTEGER;
    v_vencimento    DATE;
    v_geradas       INTEGER := 0;
    v_duplicadas    INTEGER := 0;
BEGIN
    v_referencia := p_ano * 100 + p_mes; -- ex: 202601

    FOR v_socio_plano IN
        SELECT
            sp.socio_id,
            sp.plano_id,
            p.valor_mensalidade,
            p.dia_vencimento
        FROM socios_planos sp
        JOIN planos p ON p.id = sp.plano_id
        JOIN socios s ON s.id = sp.socio_id
        WHERE sp.status = 'ativo'
          AND s.status = 'ativo'
          AND (sp.data_fim IS NULL OR sp.data_fim >= make_date(p_ano, p_mes, 1))
    LOOP
        -- Calcular data de vencimento
        v_vencimento := make_date(p_ano, p_mes, v_socio_plano.dia_vencimento);

        -- Inserir mensalidade (ignorar se já existe)
        BEGIN
            INSERT INTO mensalidades (
                socio_id, plano_id, valor, data_vencimento,
                status, referencia_mes
            ) VALUES (
                v_socio_plano.socio_id,
                v_socio_plano.plano_id,
                v_socio_plano.valor_mensalidade,
                v_vencimento,
                'pendente',
                v_referencia
            );
            v_geradas := v_geradas + 1;
        EXCEPTION WHEN unique_violation THEN
            v_duplicadas := v_duplicadas + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'referencia', v_referencia,
        'geradas', v_geradas,
        'duplicadas', v_duplicadas
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: Marcar mensalidades vencidas automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_atualizar_mensalidades_vencidas()
RETURNS JSONB AS $$
DECLARE
    v_atualizadas INTEGER;
BEGIN
    UPDATE mensalidades
    SET status     = 'vencido',
        updated_at = NOW()
    WHERE status        = 'pendente'
      AND data_vencimento < CURRENT_DATE;

    GET DIAGNOSTICS v_atualizadas = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'atualizadas', v_atualizadas,
        'data', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: Registrar pagamento de mensalidade
-- ============================================================
CREATE OR REPLACE FUNCTION fn_pagar_mensalidade(
    p_mensalidade_id UUID,
    p_forma_pagamento forma_pagamento_enum,
    p_valor_pago     NUMERIC,
    p_usuario_id     UUID,
    p_observacao     TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_mensalidade   RECORD;
    v_categoria_id  UUID;
BEGIN
    SELECT m.*, s.nome as socio_nome INTO v_mensalidade
    FROM mensalidades m
    JOIN socios s ON s.id = m.socio_id
    WHERE m.id = p_mensalidade_id
      AND m.status IN ('pendente', 'vencido')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mensalidade % não encontrada ou já paga', p_mensalidade_id;
    END IF;

    -- Calcular multa e juros para vencidas
    -- (simplificado - pode ser expandido com regras de negócio específicas)
    UPDATE mensalidades SET
        status          = 'pago',
        data_pagamento  = NOW(),
        forma_pagamento = p_forma_pagamento,
        valor_pago      = p_valor_pago,
        usuario_baixa   = p_usuario_id,
        observacao      = COALESCE(p_observacao, observacao),
        updated_at      = NOW()
    WHERE id = p_mensalidade_id;

    -- Buscar categoria financeira
    SELECT id INTO v_categoria_id
    FROM categorias_financeiras
    WHERE nome = 'Mensalidades' AND tipo = 'receita'
    LIMIT 1;

    -- Registrar no financeiro
    INSERT INTO movimentacoes_financeiras (
        categoria_id, descricao, valor, tipo, origem, referencia_id, usuario_id
    ) VALUES (
        v_categoria_id,
        'Mensalidade ' || to_char(NOW(), 'MM/YYYY') || ' - ' || v_mensalidade.socio_nome,
        p_valor_pago,
        'receita',
        'mensalidade',
        p_mensalidade_id,
        p_usuario_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'mensalidade_id', p_mensalidade_id,
        'valor_pago', p_valor_pago
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: Fechar caixa (calcula totais automaticamente)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_fechar_caixa(
    p_caixa_id       UUID,
    p_usuario_id     UUID,
    p_valor_final    NUMERIC,
    p_observacao     TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caixa         RECORD;
    v_total_entradas NUMERIC;
    v_total_saidas   NUMERIC;
    v_valor_esperado NUMERIC;
BEGIN
    SELECT * INTO v_caixa
    FROM caixas
    WHERE id = p_caixa_id AND status = 'aberto'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caixa % não encontrado ou já fechado', p_caixa_id;
    END IF;

    -- Calcular totais das movimentações
    SELECT
        COALESCE(SUM(CASE WHEN tipo IN ('entrada', 'suprimento') THEN valor ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo IN ('saida', 'sangria') THEN valor ELSE 0 END), 0)
    INTO v_total_entradas, v_total_saidas
    FROM movimentacoes_caixa
    WHERE caixa_id = p_caixa_id;

    v_valor_esperado := v_caixa.valor_inicial + v_total_entradas - v_total_saidas;

    UPDATE caixas SET
        data_fechamento    = NOW(),
        usuario_fechamento = p_usuario_id,
        valor_final        = p_valor_final,
        valor_esperado     = v_valor_esperado,
        diferenca          = p_valor_final - v_valor_esperado,
        status             = 'fechado',
        observacao         = p_observacao,
        updated_at         = NOW()
    WHERE id = p_caixa_id;

    RETURN jsonb_build_object(
        'success', true,
        'caixa_id', p_caixa_id,
        'valor_inicial', v_caixa.valor_inicial,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas,
        'valor_esperado', v_valor_esperado,
        'valor_final', p_valor_final,
        'diferenca', p_valor_final - v_valor_esperado
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: Dashboard - Métricas do sistema
-- ============================================================
CREATE OR REPLACE FUNCTION fn_dashboard_metricas()
RETURNS JSONB AS $$
DECLARE
    v_total_socios         INTEGER;
    v_socios_ativos        INTEGER;
    v_socios_inadimplentes INTEGER;
    v_mensalidades_pendentes INTEGER;
    v_faturamento_mes      NUMERIC;
    v_vendas_bar_mes       NUMERIC;
    v_produtos_estoque_baixo INTEGER;
    v_caixa_aberto         JSONB;
BEGIN
    SELECT COUNT(*) INTO v_total_socios FROM socios;
    SELECT COUNT(*) INTO v_socios_ativos FROM socios WHERE status = 'ativo';

    SELECT COUNT(DISTINCT socio_id) INTO v_socios_inadimplentes
    FROM mensalidades
    WHERE status IN ('pendente', 'vencido')
      AND data_vencimento < CURRENT_DATE;

    SELECT COUNT(*) INTO v_mensalidades_pendentes
    FROM mensalidades
    WHERE status IN ('pendente', 'vencido');

    SELECT COALESCE(SUM(valor_pago), 0) INTO v_faturamento_mes
    FROM mensalidades
    WHERE status = 'pago'
      AND date_trunc('month', data_pagamento) = date_trunc('month', NOW());

    SELECT COALESCE(SUM(valor_total), 0) INTO v_vendas_bar_mes
    FROM vendas
    WHERE status = 'finalizada'
      AND date_trunc('month', data_venda) = date_trunc('month', NOW());

    SELECT COUNT(*) INTO v_produtos_estoque_baixo
    FROM estoque e
    JOIN produtos p ON p.id = e.produto_id
    WHERE e.quantidade_atual <= p.estoque_minimo
      AND p.ativo = TRUE;

    SELECT jsonb_build_object(
        'id', id,
        'data_abertura', data_abertura,
        'valor_inicial', valor_inicial
    ) INTO v_caixa_aberto
    FROM caixas WHERE status = 'aberto' LIMIT 1;

    RETURN jsonb_build_object(
        'total_socios', v_total_socios,
        'socios_ativos', v_socios_ativos,
        'socios_inadimplentes', v_socios_inadimplentes,
        'mensalidades_pendentes', v_mensalidades_pendentes,
        'faturamento_mensalidades_mes', v_faturamento_mes,
        'vendas_bar_mes', v_vendas_bar_mes,
        'produtos_estoque_baixo', v_produtos_estoque_baixo,
        'caixa_aberto', v_caixa_aberto,
        'gerado_em', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEW: Produtos com alerta de estoque baixo
-- ============================================================
CREATE OR REPLACE VIEW vw_estoque_baixo AS
SELECT
    p.id,
    p.nome,
    p.codigo_barras,
    c.nome as categoria,
    e.quantidade_atual,
    p.estoque_minimo,
    (p.estoque_minimo - e.quantidade_atual) as deficit,
    e.ultima_atualizacao
FROM produtos p
JOIN estoque e ON e.produto_id = p.id
LEFT JOIN categorias_produto c ON c.id = p.categoria_id
WHERE e.quantidade_atual <= p.estoque_minimo
  AND p.ativo = TRUE
ORDER BY deficit DESC;

-- ============================================================
-- VIEW: Sócios inadimplentes com detalhes
-- ============================================================
CREATE OR REPLACE VIEW vw_inadimplentes AS
SELECT
    s.id as socio_id,
    s.nome,
    s.cpf,
    s.telefone,
    s.email,
    s.status as status_socio,
    COUNT(m.id) as total_mensalidades_abertas,
    SUM(m.valor) as valor_total_devido,
    MIN(m.data_vencimento) as vencimento_mais_antigo,
    MAX(m.data_vencimento) as vencimento_mais_recente,
    CURRENT_DATE - MIN(m.data_vencimento) as dias_inadimplente
FROM socios s
JOIN mensalidades m ON m.socio_id = s.id
WHERE m.status IN ('pendente', 'vencido')
  AND m.data_vencimento < CURRENT_DATE
GROUP BY s.id, s.nome, s.cpf, s.telefone, s.email, s.status
ORDER BY dias_inadimplente DESC;

-- ============================================================
-- VIEW: Resumo de vendas por dia
-- ============================================================
CREATE OR REPLACE VIEW vw_vendas_resumo_diario AS
SELECT
    DATE(data_venda) as data,
    COUNT(*) as total_vendas,
    SUM(valor_total) as total_faturado,
    AVG(valor_total) as ticket_medio,
    SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN valor_total ELSE 0 END) as total_dinheiro,
    SUM(CASE WHEN forma_pagamento = 'pix' THEN valor_total ELSE 0 END) as total_pix,
    SUM(CASE WHEN forma_pagamento = 'cartao_debito' THEN valor_total ELSE 0 END) as total_debito,
    SUM(CASE WHEN forma_pagamento = 'cartao_credito' THEN valor_total ELSE 0 END) as total_credito
FROM vendas
WHERE status = 'finalizada'
GROUP BY DATE(data_venda)
ORDER BY data DESC;

-- ============================================================
-- VIEW: Produtos mais vendidos
-- ============================================================
CREATE OR REPLACE VIEW vw_produtos_mais_vendidos AS
SELECT
    p.id,
    p.nome,
    c.nome as categoria,
    SUM(iv.quantidade) as total_quantidade,
    SUM(iv.subtotal) as total_faturado,
    COUNT(DISTINCT iv.venda_id) as total_vendas
FROM itens_venda iv
JOIN produtos p ON p.id = iv.produto_id
JOIN vendas v ON v.id = iv.venda_id
LEFT JOIN categorias_produto c ON c.id = p.categoria_id
WHERE v.status = 'finalizada'
GROUP BY p.id, p.nome, c.nome
ORDER BY total_faturado DESC;

-- ============================================================
-- Dados iniciais (Seeds)
-- ============================================================

-- Categorias financeiras padrão
INSERT INTO categorias_financeiras (nome, tipo) VALUES
    ('Mensalidades', 'receita'),
    ('Vendas Bar', 'receita'),
    ('Outras Receitas', 'receita'),
    ('Fornecedores', 'despesa'),
    ('Funcionários', 'despesa'),
    ('Aluguel', 'despesa'),
    ('Energia/Água', 'despesa'),
    ('Manutenção', 'despesa'),
    ('Outras Despesas', 'despesa')
ON CONFLICT DO NOTHING;

-- Categorias de produto padrão do bar
INSERT INTO categorias_produto (nome) VALUES
    ('Cervejas'),
    ('Destilados'),
    ('Vinhos'),
    ('Não Alcoólicos'),
    ('Petiscos'),
    ('Cigarros'),
    ('Outros')
ON CONFLICT DO NOTHING;
