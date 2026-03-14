-- ============================================================
-- 006 - Novos Módulos: Dependentes, Controle de Acesso
-- ============================================================

-- ============================================================
-- 1. DEPENDENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS dependentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id        UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  data_nascimento DATE,
  grau_parentesco TEXT NOT NULL,
  cpf             TEXT,
  foto_url        TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_dependentes_updated_at
  BEFORE UPDATE ON dependentes
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_dependentes_socio ON dependentes(socio_id);
CREATE INDEX idx_dependentes_ativo ON dependentes(ativo);

-- ============================================================
-- 2. CONTROLE DE ACESSO — Biometria / Códigos
-- ============================================================
CREATE TABLE IF NOT EXISTS acessos_biometria (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id      UUID REFERENCES socios(id) ON DELETE CASCADE,
  dependente_id UUID REFERENCES dependentes(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('biometria', 'codigo', 'cartao')),
  codigo        TEXT,   -- código de acesso ou matrícula
  descricao     TEXT,   -- ex: "Cartão azul", "Digital direita"
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_acesso_owner CHECK (
    (socio_id IS NOT NULL AND dependente_id IS NULL) OR
    (socio_id IS NULL    AND dependente_id IS NOT NULL)
  )
);

CREATE INDEX idx_acessos_biometria_socio ON acessos_biometria(socio_id);
CREATE INDEX idx_acessos_biometria_dep   ON acessos_biometria(dependente_id);
CREATE INDEX idx_acessos_biometria_cod   ON acessos_biometria(codigo) WHERE codigo IS NOT NULL;

-- ============================================================
-- 3. CONTROLE DE ACESSO — Registros de Entrada/Saída
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_acesso (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id        UUID REFERENCES socios(id),
  dependente_id   UUID REFERENCES dependentes(id),
  data_hora       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  liberado        BOOLEAN NOT NULL DEFAULT false,
  motivo_bloqueio TEXT,
  terminal        TEXT,     -- identificador da catraca/terminal
  usuario_id      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registros_acesso_socio    ON registros_acesso(socio_id);
CREATE INDEX idx_registros_acesso_dep      ON registros_acesso(dependente_id);
CREATE INDEX idx_registros_acesso_data     ON registros_acesso(data_hora DESC);
CREATE INDEX idx_registros_acesso_liberado ON registros_acesso(liberado);

-- ============================================================
-- 4. RLS — Dependentes
-- ============================================================
ALTER TABLE dependentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dep_select" ON dependentes
  FOR SELECT TO authenticated USING (fn_is_authenticated());

CREATE POLICY "dep_insert" ON dependentes
  FOR INSERT TO authenticated WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY "dep_update" ON dependentes
  FOR UPDATE TO authenticated USING (fn_is_admin_or_gerente());

CREATE POLICY "dep_delete" ON dependentes
  FOR DELETE TO authenticated USING (fn_is_admin_or_gerente());

-- ============================================================
-- 5. RLS — Biometria
-- ============================================================
ALTER TABLE acessos_biometria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biometria_select" ON acessos_biometria
  FOR SELECT TO authenticated USING (fn_is_authenticated());

CREATE POLICY "biometria_insert" ON acessos_biometria
  FOR INSERT TO authenticated WITH CHECK (fn_is_admin_or_gerente());

CREATE POLICY "biometria_update" ON acessos_biometria
  FOR UPDATE TO authenticated USING (fn_is_admin_or_gerente());

CREATE POLICY "biometria_delete" ON acessos_biometria
  FOR DELETE TO authenticated USING (fn_is_admin_or_gerente());

-- ============================================================
-- 6. RLS — Registros de Acesso
-- ============================================================
ALTER TABLE registros_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reg_acesso_select" ON registros_acesso
  FOR SELECT TO authenticated USING (fn_is_authenticated());

CREATE POLICY "reg_acesso_insert" ON registros_acesso
  FOR INSERT TO authenticated WITH CHECK (fn_is_authenticated());

-- ============================================================
-- 7. Função: verificar acesso (lógica da catraca)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_verificar_acesso(
  p_codigo       TEXT    DEFAULT NULL,
  p_socio_id     UUID    DEFAULT NULL,
  p_dependente_id UUID   DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_socio_id      UUID;
  v_dependente_id UUID;
  v_nome          TEXT;
  v_inadimplente  BOOLEAN := false;
BEGIN
  -- Buscar por código se fornecido
  IF p_codigo IS NOT NULL THEN
    SELECT ab.socio_id, ab.dependente_id
    INTO v_socio_id, v_dependente_id
    FROM acessos_biometria ab
    WHERE ab.codigo = p_codigo AND ab.ativo = true
    LIMIT 1;

    IF v_socio_id IS NULL AND v_dependente_id IS NULL THEN
      RETURN json_build_object('liberado', false, 'motivo', 'Código de acesso não encontrado');
    END IF;
  ELSE
    v_socio_id      := p_socio_id;
    v_dependente_id := p_dependente_id;
  END IF;

  -- Se for dependente, buscar sócio responsável
  IF v_dependente_id IS NOT NULL THEN
    SELECT d.nome, d.socio_id
    INTO v_nome, v_socio_id
    FROM dependentes d
    WHERE d.id = v_dependente_id AND d.ativo = true;

    IF v_nome IS NULL THEN
      RETURN json_build_object('liberado', false, 'motivo', 'Dependente inativo ou não encontrado');
    END IF;
  END IF;

  -- Verificar situação do sócio titular
  IF v_socio_id IS NOT NULL THEN
    SELECT s.nome
    INTO v_nome
    FROM socios s
    WHERE s.id = v_socio_id AND s.status = 'ativo';

    IF v_nome IS NULL THEN
      RETURN json_build_object('liberado', false, 'motivo', 'Sócio inativo ou bloqueado');
    END IF;

    -- Verificar inadimplência
    SELECT EXISTS(
      SELECT 1 FROM mensalidades m
      WHERE m.socio_id = v_socio_id
        AND m.status IN ('pendente', 'vencido')
        AND m.data_vencimento < CURRENT_DATE
    ) INTO v_inadimplente;

    IF v_inadimplente THEN
      RETURN json_build_object(
        'liberado',   false,
        'motivo',     'Sócio com mensalidade em atraso',
        'nome',       v_nome,
        'socio_id',   v_socio_id
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'liberado',       true,
    'nome',           v_nome,
    'socio_id',       v_socio_id,
    'dependente_id',  v_dependente_id
  );
END;
$$;

-- ============================================================
-- 8. Grants para usuários autenticados
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON dependentes     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON acessos_biometria TO authenticated;
GRANT SELECT, INSERT                 ON registros_acesso  TO authenticated;

-- ============================================================
-- 9. CRON JOB (ativar manualmente no painel do Supabase)
-- ============================================================
-- Para ativar a cobrança automática no dia 1º às 06:00:
-- Execute no SQL Editor do Supabase:
--
-- SELECT cron.schedule(
--   'gerar-mensalidades-mensais',
--   '0 6 1 * *',
--   $$SELECT fn_gerar_mensalidades(DATE_TRUNC('month', CURRENT_DATE)::DATE)$$
-- );
--
-- Para marcar vencidas diariamente à meia-noite:
-- SELECT cron.schedule(
--   'atualizar-mensalidades-vencidas',
--   '0 1 * * *',
--   $$SELECT fn_atualizar_mensalidades_vencidas()$$
-- );
--
-- Para verificar jobs ativos:
-- SELECT * FROM cron.job;
