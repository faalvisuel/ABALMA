import { supabase } from './supabase'

export async function createPayDunyaPaymentRequest(bookingId: string, method: 'wave' | 'orange_money', phone?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('paydunya-payments', {
      body: { action: 'create', booking_id: bookingId, method, phone },
    })

    if (error) {
      return {
        ok: false,
        code: 'FUNCTION_ERROR',
        message: error.message || 'Le backend PayDunya a refusé la demande.',
      }
    }

    if (!data?.ok || typeof data.checkout_url !== 'string') {
      return { ok: false, code: 'CHECKOUT_ERROR', message: data?.message || 'PayDunya n’a pas retourné de lien de paiement.' }
    }
    return { ok: true, checkoutUrl: data.checkout_url }
  } catch (error: any) {
    return {
      ok: false,
      code: 'REQUEST_ERROR',
      message: error?.message || 'Erreur réseau pendant la requête PayDunya.',
    }
  }
}
