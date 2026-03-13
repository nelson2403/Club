-- ============================================================
-- SISTEMA CLUBE DE SÓCIOS COM BAR E PDV
-- Migration 001: Schema Principal
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- necessário para EXCLUDE com UUID + daterange

-- ============================================================
-- TIPOS ENUMERADOS (ENUMS)
-- ============================================================

CREATE TYPE tipo_usuario_enum AS ENUM ('admin', 'gerente', 'caixa');
CREATE TYPE status_socio_enum AS ENUM ('ativo', 'inativo', 'bloqueado');
CREATE TYPE status_plano_enum AS ENUM ('ativo', 'inativo', 'cancelado');
CREATE TYPE status_mensalidade_enum AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');
CREATE TYPE forma_pagamento_enum AS ENUM ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia');
CREATE TYPE tipo_cobranca_enum AS ENUM ('manual', 'whatsapp', 'email', 'sistema');
CREATE TYPE tipo_movimentacao_enum AS ENUM ('entrada', 'saida', 'ajuste');
CREATE TYPE tipo_financeiro_enum AS ENUM ('receita', 'despesa');
CREATE TYPE origem_financeiro_enum AS ENUM ('mensalidade', 'venda', 'despesa', 'outro');
CREATE TYPE status_venda_enum AS ENUM ('aberta', 'finalizada', 'cancelada');
CREATE TYPE status_caixa_enum AS ENUM ('aberto', 'fechado');
CREATE TYPE tipo_movimentacao_caixa_enum AS ENUM ('entrada', 'saida', 'sangria', 'suprimento');

-- ============================================================
-- MÓDULO: USUÁRIOS DO SISTEMA
-- ============================================================

-- Tabela de usuários (espelha o Supabase Auth)
CREATE TABLE IF NOT EXISTS usuarios (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    tipo_usuario tipo_usuario_enum NOT NULL DEFAULT 'caixa',
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO: SÓCIOS E PLANOS
-- ============================================================

-- Planos de mensalidade disponíveis
CREATE TABLE IF NOT EXISTS planos (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_plano        TEXT NOT NULL,
    valor_mensalidade NUMERIC(10,2) NOT NULL CHECK (valor_mensalidade >= 0),
    dia_vencimento    SMALLINT NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 28),
    descricao         TEXT,
    ativo             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cadastro de sócios
CREATE TABLE IF NOT EXISTS socios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    cpf             TEXT UNIQUE,
    telefone        TEXT,
    email           TEXT,
    endereco        TEXT,
    numero          TEXT,
    complemento     TEXT,
    bairro          TEXT,
    cidade          TEXT,
    estado          CHAR(2),
    cep             TEXT,
    data_nascimento DATE,
    data_cadastro   DATE NOT NULL DEFAULT CURRENT_DATE,
    status          status_socio_enum NOT NULL DEFAULT 'ativo',
    foto_url        TEXT,
    observacoes     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relacionamento sócio ↔ plano (histórico de planos do sócio)
CREATE TABLE IF NOT EXISTS socios_planos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    socio_id    UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
    plano_id    UUID NOT NULL REFERENCES planos(id) ON DELETE RESTRICT,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim    DATE,
    status      status_plano_enum NOT NULL DEFAULT 'ativo',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Garante que um sócio tem apenas um plano ativo por vez
    CONSTRAINT unique_socio_plano_ativo EXCLUDE USING gist (
        socio_id WITH =,
        daterange(data_inicio, COALESCE(data_fim, '9999-12-31')) WITH &&
    ) WHERE (status = 'ativo')
);

-- Mensalidades geradas por sócio/plano
CREATE TABLE IF NOT EXISTS mensalidades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    socio_id        UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
    plano_id        UUID NOT NULL REFERENCES planos(id) ON DELETE RESTRICT,
    valor           NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    data_vencimento DATE NOT NULL,
    data_pagamento  TIMESTAMPTZ,
    status          status_mensalidade_enum NOT NULL DEFAULT 'pendente',
    forma_pagamento forma_pagamento_enum,
    valor_pago      NUMERIC(10,2),
    desconto        NUMERIC(10,2) DEFAULT 0,
    multa           NUMERIC(10,2) DEFAULT 0,
    juros           NUMERIC(10,2) DEFAULT 0,
    usuario_baixa   UUID REFERENCES usuarios(id),
    observacao      TEXT,
    referencia_mes  INTEGER NOT NULL, -- formato YYYYMM ex: 202601
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Evita duplicidade de mensalidade por sócio/mês
    UNIQUE (socio_id, referencia_mes)
);

-- Histórico de cobranças enviadas para inadimplentes
CREATE TABLE IF NOT EXISTS historico_cobrancas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mensalidade_id  UUID NOT NULL REFERENCES mensalidades(id) ON DELETE CASCADE,
    data_cobranca   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo_cobranca   tipo_cobranca_enum NOT NULL,
    status          TEXT NOT NULL DEFAULT 'enviado', -- enviado, falhou, visualizado
    observacao      TEXT,
    usuario_id      UUID REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO: PRODUTOS E ESTOQUE
-- ============================================================

-- Categorias de produtos do bar
CREATE TABLE IF NOT EXISTS categorias_produto (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome       TEXT NOT NULL UNIQUE,
    descricao  TEXT,
    ativo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produtos do bar
CREATE TABLE IF NOT EXISTS produtos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    categoria_id    UUID REFERENCES categorias_produto(id) ON DELETE SET NULL,
    preco_venda     NUMERIC(10,2) NOT NULL CHECK (preco_venda >= 0),
    custo           NUMERIC(10,2) DEFAULT 0 CHECK (custo >= 0),
    codigo_barras   TEXT UNIQUE,
    estoque_minimo  NUMERIC(10,3) NOT NULL DEFAULT 0,
    unidade_medida  TEXT NOT NULL DEFAULT 'un', -- un, kg, litro, etc.
    descricao       TEXT,
    foto_url        TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saldo atual de estoque por produto
CREATE TABLE IF NOT EXISTS estoque (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id         UUID NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
    quantidade_atual   NUMERIC(10,3) NOT NULL DEFAULT 0,
    ultima_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico completo de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id   UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    tipo         tipo_movimentacao_enum NOT NULL,
    quantidade   NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
    saldo_antes  NUMERIC(10,3) NOT NULL,
    saldo_depois NUMERIC(10,3) NOT NULL,
    usuario_id   UUID REFERENCES usuarios(id),
    referencia   TEXT, -- ex: venda_id, nota_fiscal etc.
    data         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observacao   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO: PDV — CAIXA
-- ============================================================

-- Controle de abertura/fechamento de caixa
CREATE TABLE IF NOT EXISTS caixas (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_abertura      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_fechamento    TIMESTAMPTZ,
    usuario_abertura   UUID NOT NULL REFERENCES usuarios(id),
    usuario_fechamento UUID REFERENCES usuarios(id),
    valor_inicial      NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_final        NUMERIC(10,2),
    valor_esperado     NUMERIC(10,2), -- calculado automaticamente
    diferenca          NUMERIC(10,2), -- valor_final - valor_esperado
    status             status_caixa_enum NOT NULL DEFAULT 'aberto',
    observacao         TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Movimentações dentro de um caixa (entradas/saídas/sangrias)
CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caixa_id    UUID NOT NULL REFERENCES caixas(id) ON DELETE RESTRICT,
    tipo        tipo_movimentacao_caixa_enum NOT NULL,
    descricao   TEXT NOT NULL,
    valor       NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    usuario_id  UUID REFERENCES usuarios(id),
    venda_id    UUID, -- referência opcional à venda
    data        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO: PDV — VENDAS
-- ============================================================

-- Cabeçalho da venda
CREATE TABLE IF NOT EXISTS vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_venda     SERIAL, -- número sequencial legível
    data_venda       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id       UUID NOT NULL REFERENCES usuarios(id),
    socio_id         UUID REFERENCES socios(id) ON DELETE SET NULL,
    caixa_id         UUID REFERENCES caixas(id) ON DELETE RESTRICT,
    valor_subtotal   NUMERIC(10,2) NOT NULL DEFAULT 0,
    desconto         NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_recebido   NUMERIC(10,2),
    troco            NUMERIC(10,2) GENERATED ALWAYS AS (
                         CASE WHEN valor_recebido > valor_total
                              THEN valor_recebido - valor_total
                              ELSE 0 END
                     ) STORED,
    forma_pagamento  forma_pagamento_enum NOT NULL,
    status           status_venda_enum NOT NULL DEFAULT 'aberta',
    observacao       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Itens da venda
CREATE TABLE IF NOT EXISTS itens_venda (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id        UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id      UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade      NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
    preco_unitario  NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    desconto_item   NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal        NUMERIC(10,2) GENERATED ALWAYS AS (
                        (quantidade * preco_unitario) - desconto_item
                    ) STORED,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO: FINANCEIRO DO CLUBE
-- ============================================================

-- Categorias do financeiro (DRE simplificado)
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome       TEXT NOT NULL,
    tipo       tipo_financeiro_enum NOT NULL,
    descricao  TEXT,
    ativo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lançamentos financeiros
CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    descricao    TEXT NOT NULL,
    valor        NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    tipo         tipo_financeiro_enum NOT NULL,
    data         DATE NOT NULL DEFAULT CURRENT_DATE,
    origem       origem_financeiro_enum NOT NULL DEFAULT 'outro',
    referencia_id UUID, -- id da venda ou mensalidade de origem
    usuario_id   UUID REFERENCES usuarios(id),
    observacao   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO: LOGS E AUDITORIA
-- ============================================================

-- Log de atividades do sistema
CREATE TABLE IF NOT EXISTS logs_atividade (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID REFERENCES usuarios(id),
    acao        TEXT NOT NULL,
    tabela      TEXT,
    registro_id TEXT,
    dados_antes JSONB,
    dados_depois JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FIM DO SCHEMA PRINCIPAL
-- ============================================================
