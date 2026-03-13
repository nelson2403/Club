# Edge Function: cobrar-mensalidades

Roda diariamente às 08:00 e envia cobrança PIX via WhatsApp para sócios com mensalidade vencendo no dia seguinte.

## Deploy

```bash
supabase functions deploy cobrar-mensalidades
```

## Variáveis de ambiente (configurar no Supabase Dashboard → Edge Functions → Secrets)

```
ASAAS_API_KEY=sua_chave
ASAAS_SANDBOX=false
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave
EVOLUTION_INSTANCE_NAME=clube
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
CRON_SECRET=um_token_secreto_qualquer
```

## Agendamento (pg_cron)

Execute no SQL Editor do Supabase:

```sql
select cron.schedule(
  'cobrar-mensalidades-diario',
  '0 8 * * *',  -- todo dia às 08:00 UTC (05:00 BRT)
  $$
  select
    net.http_post(
      url := 'https://hybzswsibnmewuovogsf.supabase.co/functions/v1/cobrar-mensalidades',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_CRON_SECRET"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

> Substitua `SEU_CRON_SECRET` pelo valor definido em `CRON_SECRET`.

## Teste manual

```bash
curl -X POST https://hybzswsibnmewuovogsf.supabase.co/functions/v1/cobrar-mensalidades \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```
