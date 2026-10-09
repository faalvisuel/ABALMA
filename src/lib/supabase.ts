import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)
export const supabase = createClient(url || 'https://non-configure.supabase.co', key || 'non-configure')

/** Message d'erreur lisible, en français. */
export function errMsg(e: any): string {
  const m = e?.message || String(e || '')
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail.'
  if (/Email not confirmed/i.test(m)) return 'Confirmez votre e-mail avec le lien reçu, puis reconnectez-vous.'
  if (/Password should be/i.test(m)) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (/Failed to fetch/i.test(m)) return 'Connexion impossible. Vérifiez votre réseau et réessayez.'
  return m || 'Une erreur est survenue. Réessayez.'
}
