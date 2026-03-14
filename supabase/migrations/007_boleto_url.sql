-- Adiciona coluna boleto_url na tabela mensalidades
-- Necessário para armazenar o link do boleto gerado pelo Asaas (billingType UNDEFINED)
ALTER TABLE mensalidades ADD COLUMN IF NOT EXISTS boleto_url TEXT;
