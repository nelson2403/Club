-- ============================================================
-- Migration 008: Vencimento fixo dia 10 + Multa R$10 pós-vencimento
-- ============================================================

-- 1. Atualizar todos os planos para dia_vencimento = 10
UPDATE planos SET dia_vencimento = 10;

-- 2. Recriar fn_gerar_mensalidades com dia de vencimento fixo = 10
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
            p.valor_mensalidade
        FROM socios_planos sp
        JOIN planos p ON p.id = sp.plano_id
        JOIN socios s ON s.id = sp.socio_id
        WHERE sp.status = 'ativo'
          AND s.status = 'ativo'
          AND (sp.data_fim IS NULL OR sp.data_fim >= make_date(p_ano, p_mes, 1))
    LOOP
        -- Vencimento SEMPRE dia 10
        v_vencimento := make_date(p_ano, p_mes, 10);

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

-- 3. Recriar fn_atualizar_mensalidades_vencidas com multa de R$10
--    A multa só é aplicada uma vez (na transição pendente → vencido).
--    Como a query filtra status = 'pendente', nunca aplica duas vezes.
CREATE OR REPLACE FUNCTION fn_atualizar_mensalidades_vencidas()
RETURNS JSONB AS $$
DECLARE
    v_atualizadas INTEGER;
BEGIN
    UPDATE mensalidades
    SET status     = 'vencido',
        valor      = valor + 10,   -- multa de R$10
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
-- Cron jobs (rodar no SQL Editor do Supabase após a migration)
-- ============================================================
-- Dia 1 de cada mês às 06:00: gera mensalidades
-- SELECT cron.schedule('gerar-mensalidades-mensais', '0 6 1 * *',
--   $$SELECT fn_gerar_mensalidades(
--       EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
--       EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
--     )$$);

-- Diário às 01:00: marca vencidas e aplica multa
-- SELECT cron.schedule('atualizar-mensalidades-vencidas', '0 1 * * *',
--   $$SELECT fn_atualizar_mensalidades_vencidas()$$);

-- Dia 1 às 08:00: envia cobranças via WhatsApp (chamar Edge Function)
-- SELECT cron.schedule('enviar-cobrancas-mensais', '0 8 1 * *',
--   $$SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/enviar-cobrancas',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := jsonb_build_object('tipo', 'mensal')
--     )$$);

-- Dia 9 às 08:00: envia lembrete (1 dia antes do vencimento dia 10)
-- SELECT cron.schedule('enviar-lembrete-vencimento', '0 8 9 * *',
--   $$SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/enviar-cobrancas',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := jsonb_build_object('tipo', 'lembrete')
--     )$$);
