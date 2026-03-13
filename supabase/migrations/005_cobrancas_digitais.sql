-- ============================================================
-- Migration 005: Cobranças Digitais (PIX + WhatsApp + Portal)
-- ============================================================

-- Campos no sócio: whatsapp dedicado + token único do portal
ALTER TABLE socios ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE socios ADD COLUMN IF NOT EXISTS token_portal UUID DEFAULT gen_random_uuid() UNIQUE;

-- Gerar token para sócios já existentes que não têm
UPDATE socios SET token_portal = gen_random_uuid() WHERE token_portal IS NULL;

-- Campos na mensalidade: dados da cobrança Asaas
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS asaas_id VARCHAR(255) UNIQUE;
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255);
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS pix_qrcode TEXT;         -- base64 da imagem
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT;     -- texto copia e cola
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS link_pagamento TEXT;     -- link de pagamento
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS enviado_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS data_envio_whatsapp TIMESTAMPTZ;
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS cobranca_gerada_em TIMESTAMPTZ;

-- Índices
CREATE INDEX IF NOT EXISTS idx_mensalidades_asaas_id      ON mensalidades(asaas_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_vencimento_status ON mensalidades(data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_socios_token_portal         ON socios(token_portal);

-- RLS: portal do sócio pode ler suas próprias mensalidades via token
-- Usamos uma função que verifica o token passado como claim
CREATE OR REPLACE FUNCTION fn_get_socio_by_token(p_token UUID)
RETURNS UUID AS $$
    SELECT id FROM socios WHERE token_portal = p_token LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
