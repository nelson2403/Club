import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const dashboardApi = {
  metricas: async () => {
    const { data, error } = await supabase.rpc('fn_dashboard_metricas')
    if (error) throw error
    return data
  },
}
