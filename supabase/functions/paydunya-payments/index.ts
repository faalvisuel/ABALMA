import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const env = (name: string) => Deno.env.get(name) || ''

function config() {
  const mode = env('PAYDUNYA_MODE') || 'sandbox'
  if (!['sandbox', 'live'].includes(mode)) throw new Error('Mode PayDunya invalide.')
  const suffix = mode === 'sandbox' ? 'sandbox-api' : 'api'
  const baseUrl = `https://app.paydunya.com/${suffix}/v1/checkout-invoice`
  const masterKey = env('PAYDUNYA_MASTER_KEY')
  const privateKey = env('PAYDUNYA_PRIVATE_KEY')
  const token = env('PAYDUNYA_TOKEN')
  if (!masterKey || !privateKey || !token) throw new Error('Secrets PayDunya incomplets dans Supabase.')
  return { mode, baseUrl, masterKey, privateKey, token }
}

function paydunyaHeaders(keys: ReturnType<typeof config>) {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': keys.masterKey,
    'PAYDUNYA-PRIVATE-KEY': keys.privateKey,
    'PAYDUNYA-TOKEN': keys.token,
  }
}

async function getInvoice(token: string, keys: ReturnType<typeof config>) {
  const response = await fetch(`${keys.baseUrl}/confirm/${encodeURIComponent(token)}`, {
    headers: paydunyaHeaders(keys),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.response_code !== '00') {
    throw new Error('Impossible de vérifier la facture auprès de PayDunya.')
  }
  return result
}

async function verifyPayment(token: string, bookingId: string, keys: ReturnType<typeof config>) {
  const invoice = await getInvoice(token, keys)
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(keys.masterKey))
  const expectedHash = Array.from(new Uint8Array(hashBuffer), byte => byte.toString(16).padStart(2, '0')).join('')
  if (invoice.hash !== expectedHash) throw new Error('Signature PayDunya invalide.')
  if (invoice.invoice?.token !== token || invoice.custom_data?.booking_id !== bookingId) {
    throw new Error('La facture PayDunya ne correspond pas à cette réservation.')
  }
  return invoice
}

async function ensureBookingCode(bookingId: string, service: ReturnType<typeof createClient>) {
  const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  const { error } = await service.from('booking_codes').upsert(
    { booking_id: bookingId, code },
    { onConflict: 'booking_id', ignoreDuplicates: true },
  )
  if (error) throw new Error('Le paiement est confirmé, mais le code de remise n’a pas pu être créé.')
}

async function finalizePayment(invoice: any, token: string, bookingId: string, service: ReturnType<typeof createClient>) {
  const { data: booking, error } = await service.from('bookings')
    .select('id, borrower_id, amount_paid, status, paydunya_token')
    .eq('id', bookingId)
    .maybeSingle()
  if (error || !booking) throw new Error('Réservation introuvable.')
  if (booking.paydunya_token !== token) throw new Error('Cette facture n’est plus la facture active de la réservation.')
  if (Number(invoice.invoice?.total_amount) !== Number(booking.amount_paid)) {
    throw new Error('Le montant PayDunya ne correspond pas au montant de la réservation.')
  }
  if (invoice.status !== 'completed') return { completed: false }
  if (booking.status === 'paid' || booking.status === 'ongoing' || booking.status === 'done') {
    await ensureBookingCode(bookingId, service)
    return { completed: true }
  }
  if (booking.status !== 'accepted') throw new Error('Cette réservation n’attend pas de paiement.')

  const { data: updated, error: updateError } = await service.from('bookings').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
  }).eq('id', bookingId).eq('status', 'accepted').eq('paydunya_token', token).select('id').maybeSingle()
  if (updateError) throw new Error('Impossible de mettre à jour la réservation.')
  if (!updated) {
    const { data: current } = await service.from('bookings').select('status').eq('id', bookingId).maybeSingle()
    if (!['paid', 'ongoing', 'done'].includes(current?.status)) throw new Error('La réservation a changé d’état pendant le paiement.')
    await ensureBookingCode(bookingId, service)
    return { completed: true }
  }

  await ensureBookingCode(bookingId, service)
  return { completed: true }
}

async function readCallback(req: Request) {
  const type = req.headers.get('content-type') || ''
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await req.formData()
    const data = form.get('data')
    return typeof data === 'string' ? JSON.parse(data) : null
  }
  const body = await req.json().catch(() => ({}))
  if (typeof body.data === 'string') return JSON.parse(body.data)
  return body.data || body
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, message: 'Méthode non autorisée.' }, 405)

  try {
    const keys = config()
    const supabaseUrl = env('SUPABASE_URL')
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) throw new Error('Configuration Supabase manquante côté serveur.')
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const body = await req.clone().json().catch(() => ({}))

    if (body.action === 'create') {
      const bearer = req.headers.get('Authorization') || ''
      const jwt = bearer.replace(/^Bearer\s+/i, '')
      if (!jwt) return json({ ok: false, message: 'Connexion requise.' }, 401)
      const anonKey = env('SUPABASE_ANON_KEY')
      if (!anonKey) throw new Error('Clé publique Supabase manquante côté serveur.')
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false },
      })
      const { data: authData, error: authError } = await authClient.auth.getUser(jwt)
      if (authError || !authData.user) return json({ ok: false, message: 'Session invalide.' }, 401)

      const bookingId = String(body.booking_id || '')
      const method = body.method
      if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !['wave', 'orange_money'].includes(method)) {
        return json({ ok: false, message: 'Réservation ou moyen de paiement invalide.' }, 400)
      }
      const { data: booking, error: bookingError } = await service.from('bookings')
        .select('id, borrower_id, amount_paid, status, paydunya_token, paydunya_checkout_url, pay_method, listing:listings(title), borrower:profiles(first_name,last_name)')
        .eq('id', bookingId)
        .maybeSingle()
      if (bookingError || !booking || booking.borrower_id !== authData.user.id) {
        return json({ ok: false, message: 'Réservation introuvable.' }, 404)
      }
      if (booking.status !== 'accepted') return json({ ok: false, message: 'Cette réservation n’attend pas de paiement.' }, 409)
      if (booking.paydunya_token && booking.paydunya_checkout_url) {
        const existingInvoice = await verifyPayment(booking.paydunya_token, bookingId, keys)
        if (existingInvoice.status === 'pending' && booking.pay_method === method) {
          return json({ ok: true, checkout_url: booking.paydunya_checkout_url })
        }
        if (existingInvoice.status === 'pending') {
          return json({ ok: false, message: 'Une facture est déjà en attente pour cette réservation. Terminez-la ou réessayez après son expiration.' }, 409)
        }
        if (existingInvoice.status === 'completed') {
          await finalizePayment(existingInvoice, booking.paydunya_token, bookingId, service)
          return json({ ok: false, message: 'Cette réservation est déjà payée.' }, 409)
        }
      }

      const siteUrl = env('APP_BASE_URL').replace(/\/$/, '')
      if (!siteUrl) throw new Error('Ajoute APP_BASE_URL dans les secrets Supabase.')
      const channel = method === 'wave' ? 'wave-senegal' : 'orange-money-senegal'
      const phone = String(body.phone || '').replace(/\D/g, '').slice(0, 15)
      const customer = booking.borrower
      const invoiceRequest = {
        invoice: {
          total_amount: Number(booking.amount_paid),
          description: `Location alma - ${booking.listing?.title || 'réservation'}`,
          channels: [channel],
          customer: { name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(), email: authData.user.email || '', phone },
        },
        store: { name: 'alma', tagline: 'Location de matériel entre particuliers', website_url: siteUrl },
        custom_data: { booking_id: bookingId },
        actions: {
          cancel_url: `${siteUrl}/reservation/${bookingId}?payment=cancelled`,
          return_url: `${siteUrl}/reservation/${bookingId}?payment=return`,
          callback_url: `${supabaseUrl}/functions/v1/paydunya-payments`,
        },
      }
      const response = await fetch(`${keys.baseUrl}/create`, {
        method: 'POST',
        headers: paydunyaHeaders(keys),
        body: JSON.stringify(invoiceRequest),
      })
      const invoice = await response.json().catch(() => ({}))
      const checkoutUrl = invoice.response_text
      if (!response.ok || invoice.response_code !== '00' || typeof checkoutUrl !== 'string') {
        console.error('PayDunya invoice creation failed', response.status, invoice.response_code)
        return json({ ok: false, message: 'PayDunya n’a pas pu créer la facture. Vérifie les clés et les moyens actifs.' }, 502)
      }
      const parsedUrl = new URL(checkoutUrl)
      if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'app.paydunya.com') {
        return json({ ok: false, message: 'PayDunya a retourné une adresse de paiement invalide.' }, 502)
      }
      const { error: saveError } = await service.from('bookings').update({
        paydunya_token: invoice.token,
        paydunya_checkout_url: checkoutUrl,
        pay_method: method,
      }).eq('id', bookingId).eq('status', 'accepted')
      if (saveError) throw new Error('Impossible d’associer la facture à la réservation.')
      return json({ ok: true, checkout_url: checkoutUrl })
    }

    if (body.action === 'verify') {
      const bearer = req.headers.get('Authorization') || ''
      const jwt = bearer.replace(/^Bearer\s+/i, '')
      if (!jwt) return json({ ok: false, message: 'Connexion requise.' }, 401)
      const anonKey = env('SUPABASE_ANON_KEY')
      if (!anonKey) throw new Error('Clé publique Supabase manquante côté serveur.')
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false },
      })
      const { data: authData, error: authError } = await authClient.auth.getUser(jwt)
      if (authError || !authData.user) return json({ ok: false, message: 'Session invalide.' }, 401)
      const bookingId = String(body.booking_id || '')
      const { data: booking } = await service.from('bookings').select('id, borrower_id, paydunya_token').eq('id', bookingId).maybeSingle()
      if (!booking || booking.borrower_id !== authData.user.id || !booking.paydunya_token) {
        return json({ ok: false, message: 'Facture introuvable.' }, 404)
      }
      const invoice = await verifyPayment(booking.paydunya_token, bookingId, keys)
      const result = await finalizePayment(invoice, booking.paydunya_token, bookingId, service)
      return json({ ok: true, completed: result.completed })
    }

    const callback = await readCallback(req)
    const token = String(callback?.invoice?.token || callback?.token || '')
    const bookingId = String(callback?.custom_data?.booking_id || '')
    if (!token || !/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ ok: false, message: 'Notification invalide.' }, 400)
    const invoice = await verifyPayment(token, bookingId, keys)
    const result = await finalizePayment(invoice, token, bookingId, service)
    return json({ ok: true, completed: result.completed })
  } catch (error) {
    console.error('PayDunya handler error', error instanceof Error ? error.message : 'unknown')
    return json({ ok: false, message: error instanceof Error ? error.message : 'Erreur interne du paiement.' }, 500)
  }
})