// Edge Function: Gerar mensalidades do mês
// Chamada por cron job todo dia 1 de cada mês
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json().catch(() => ({}))
    const agora = new Date()
    const ano = body.ano ?? agora.getFullYear()
    const mes = body.mes ?? agora.getMonth() + 1

    // 1. Gerar mensalidades
    const { data: geradas, error: errGerar } = await supabase
      .rpc('fn_gerar_mensalidades', { p_ano: ano, p_mes: mes })

    if (errGerar) throw errGerar

    // 2. Marcar vencidas
    const { data: vencidas, error: errVencidas } = await supabase
      .rpc('fn_atualizar_mensalidades_vencidas')

    if (errVencidas) throw errVencidas

    return new Response(
      JSON.stringify({ success: true, geradas, vencidas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
