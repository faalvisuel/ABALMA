import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { borrowerLevel, fcfa, frDate, initials, shortName, STATUS_LABEL, TAGS_FOR_BORROWER, TAGS_FOR_OWNER } from '../lib/util'
import { Avatar, ErrorBox, Header, Icon, Note, Page, Row, Spinner, Star, Stars, Thumb } from '../components/ui'
import { createPayDunyaPaymentRequest } from '../lib/paydunya'
import { BOOKING_SELECT } from './Bookings'

export default function BookingDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, refresh } = useAuth()
  const [b, setB] = useState<any>(undefined)
  const [code, setCode] = useState<string | null>(null)
  const [priv, setPriv] = useState<any>(null)
  const [myReview, setMyReview] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle()
    setB(data || null)
    if (!data) return
    if (data.borrower_id === user.id && ['paid', 'ongoing'].includes(data.status)) {
      const [c, p] = await Promise.all([
        supabase.from('booking_codes').select('code').eq('booking_id', id).maybeSingle(),
        supabase.from('listing_private').select('*').eq('listing_id', data.listing_id).maybeSingle(),
      ])
      setCode(c.data?.code || null); setPriv(p.data || null)
    }
    const r = await supabase.from('reviews').select('*').eq('booking_id', id).eq('author_id', user.id).maybeSingle()
    setMyReview(r.data || null)
  }, [id, user.id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (searchParams.get('payment') !== 'return' || !id) return
    const verify = async () => {
      const { data, error } = await supabase.functions.invoke('paydunya-payments', {
        body: { action: 'verify', booking_id: id },
      })
      if (error || !data?.ok) setErr(data?.message || 'La vérification du paiement a échoué.')
      else if (data.completed) await load()
      else setErr('Paiement en cours de confirmation. Actualisez cette page dans un instant.')
      setSearchParams({}, { replace: true })
    }
    verify()
  }, [id, load, searchParams, setSearchParams])

  async function call(fn: string, args: any) {
    setBusy(true); setErr(null)
    const { data, error } = await supabase.rpc(fn, args)
    setBusy(false)
    if (error) { setErr(errMsg(error)); return undefined }
    await load(); await refresh()
    return data ?? true
  }

  if (b === undefined) return <Page nav={false}><Spinner /></Page>
  if (!b) return <Page nav={false}><Header title="Réservation introuvable" back="/reservations" /></Page>

  const iAmOwner = b.owner_id === user.id
  const other = iAmOwner ? b.borrower : b.owner

  return <Page nav={false}>
    <Header title={iAmOwner ? 'Demande de location' : 'Ma réservation'} back={iAmOwner ? '/revenus' : '/reservations'} />
    <div className="card row" style={{ padding: 12 }}>
      <Thumb src={b.listing?.photos?.[0]} small />
      <div className="stack s2 grow">
        <div className="bold">{b.listing?.title}</div>
        <div className="small muted">{frDate(b.start_date)} → {frDate(b.end_date)} · {b.days} jour{b.days > 1 ? 's' : ''}</div>
      </div>
      <span className="pill">{STATUS_LABEL[b.status]}</span>
    </div>
    <ErrorBox msg={err} />
    {iAmOwner
      ? <OwnerView b={b} busy={busy} call={call} />
      : <BorrowerView b={b} busy={busy} setBusy={setBusy} call={call} code={code} priv={priv} setErr={setErr} />}
    {b.status === 'done' && (myReview
      ? <div className="card stack s6"><div className="bold">Votre avis</div><Stars value={myReview.stars} size={20} />{myReview.comment && <div className="soft small">{myReview.comment}</div>}</div>
      : <ReviewForm who={shortName(other)} ini={initials(other?.first_name, other?.last_name)} tags={iAmOwner ? TAGS_FOR_BORROWER : TAGS_FOR_OWNER} busy={busy}
          note={iAmOwner ? 'Votre note compte dans le score de confiance de l’emprunteur.' : 'Votre avis aide les autres emprunteurs et fait monter le niveau du loueur.'}
          avatar={other?.avatar_url}
          onSend={(stars, tags, comment) => call('submit_review', { p_id: b.id, p_stars: stars, p_tags: tags, p_comment: comment })} />)}
    <div className="card stack">
      <h2 className="h3">Montants</h2>
      <Row l={`${b.days} jour${b.days > 1 ? 's' : ''} de location`} v={fcfa(b.price_total)} />
      {!iAmOwner && b.discount > 0 && <Row l="Réduction score de confiance" v={'− ' + fcfa(b.discount)} />}
      {iAmOwner && <Row l="Commission alma (15 %)" v={'− ' + fcfa(b.price_total - b.owner_payout)} />}
      <hr className="sep" />
      <Row l={iAmOwner ? 'Vous recevez' : 'À payer'} v={fcfa(iAmOwner ? b.owner_payout : b.amount_paid)} bold />
      <Row l="Caution" v={fcfa(b.deposit)} />
    </div>
  </Page>
}

function BorrowerView({ b, busy, setBusy, call, code, priv, setErr }: any) {
  const [method, setMethod] = useState('wave')
  const [phone, setPhone] = useState('')
  const owner = shortName(b.owner)
  if (b.status === 'requested') return <div className="stack">
    <div className="notice">Votre demande est envoyée. {owner} doit l'accepter avant que vous puissiez payer.</div>
    <button className="btn danger sm" disabled={busy} onClick={() => call('cancel_booking', { p_id: b.id })}>Annuler ma demande</button>
  </div>
  if (b.status === 'refused') return <div className="notice">{owner} n'a pas pu accepter cette demande. Vous pouvez chercher un autre matériel. <Link to="/" className="bold">Retour aux annonces</Link></div>
  if (b.status === 'cancelled') return <div className="notice">Cette réservation est annulée.</div>
  if (b.status === 'accepted') return <div className="stack s16">
    <div className="test-banner">Paiement sécurisé par PayDunya. Vous serez redirigé vers la page de paiement.</div>
    <div className="stack s8"><h2 className="h3">Payer avec</h2>
      {[['wave', 'Wave'], ['orange_money', 'Orange Money']].map(([v, lab]) =>
        <label key={v} className={'radio-card' + (method === v ? ' on' : '')}><input type="radio" name="pm" checked={method === v} onChange={() => setMethod(v)} /><span className="bold">{lab}</span></label>)}
    </div>
    <div className="field"><label htmlFor="ph">Numéro du compte mobile</label><input id="ph" type="tel" inputMode="tel" placeholder="77 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} /></div>
    <Note icon="lock">alma garde votre paiement et le verse à {owner} après la remise du matériel.</Note>
    <button className="btn" disabled={busy} onClick={async () => {
      setBusy(true); setErr(null)
      const res = await createPayDunyaPaymentRequest(b.id, method as 'wave' | 'orange_money', phone)
      if (!res.ok) {
        setBusy(false)
        setErr(res.message || 'Le paiement PayDunya a échoué.')
        return
      }
      window.location.assign(res.checkoutUrl)
    }}>{busy ? 'Paiement…' : `Payer ${fcfa(b.amount_paid)}`}</button>
    <button className="btn danger sm" disabled={busy} onClick={() => call('cancel_booking', { p_id: b.id })}>Annuler la réservation</button>
  </div>
  if (b.status === 'paid' || b.status === 'ongoing') return <div className="stack s16">
    {b.status === 'paid' ? <div className="code-box">
      <div className="label">Code de remise</div>
      <div className="code">{code ? code.split('').join(' ') : '· · · ·'}</div>
      <div className="small muted">Donnez ce code à {owner} seulement quand vous avez le matériel en main. Jamais par téléphone ni par message.</div>
    </div> : <div className="notice">Location en cours. Rapportez le matériel le {frDate(b.end_date, true)} : un retour à l'heure fait monter votre score.</div>}
    <Contact priv={priv} owner={owner} />
  </div>
  if (b.status === 'dispute') return <div className="notice">Un problème a été signalé par {owner}. alma examine la situation et vous contactera.</div>
  return <div className="notice">Location terminée. Votre caution est libérée.</div>
}

function Contact({ priv, owner }: { priv: any; owner: string }) {
  if (!priv) return <div className="notice">Le propriétaire n'a pas encore renseigné son adresse.</div>
  const digits = (priv.whatsapp || '').replace(/\D/g, '')
  const intl = digits.startsWith('221') ? digits : '221' + digits
  return <>
    <div className="card stack">
      <div className="stack s2"><div className="label">Lieu de remise</div><div className="bold" style={{ fontSize: 16 }}>{priv.exact_address || 'Adresse non renseignée'}</div></div>
      {priv.exact_address && <a className="btn ghost sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(priv.exact_address + ', Dakar, Sénégal')}`}><Icon name="nav" size={18} />Ouvrir l'itinéraire</a>}
    </div>
    <div className="card stack">
      <div className="stack s2"><div className="label">Contact de {owner}</div><div className="display" style={{ fontSize: 20 }}>{priv.whatsapp || 'Numéro non renseigné'}</div></div>
      {digits && <div className="grid2">
        <a className="btn sm" target="_blank" rel="noreferrer" href={`https://wa.me/${intl}`}><Icon name="chat" size={18} />WhatsApp</a>
        <a className="btn ghost sm" href={`tel:+${intl}`}><Icon name="phone" size={18} />Appeler</a>
      </div>}
    </div>
    <Note icon="lock">L'adresse et le numéro sont visibles uniquement parce que votre réservation est payée.</Note>
  </>
}

function OwnerView({ b, busy, call }: any) {
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  const [late, setLate] = useState(false)
  const [problem, setProblem] = useState('')
  const [showProblem, setShowProblem] = useState(false)
  const p = b.borrower, lvl = borrowerLevel(p?.score ?? 400), name = shortName(p)
  const who = <div className="card stack">
    <div className="row"><Avatar src={p?.avatar_url} className="light">{initials(p?.first_name, p?.last_name)}</Avatar>
      <div className="stack s2 grow"><div className="bold">{name}{p?.verified ? ' · Identité vérifiée' : ''}</div>
        <div className="small muted">{p?.rentals_done || 0} location{(p?.rentals_done || 0) > 1 ? 's' : ''} terminée{(p?.rentals_done || 0) > 1 ? 's' : ''} · {p?.disputes || 0} litige{(p?.disputes || 0) > 1 ? 's' : ''}</div></div></div>
    <div className="card tint row small semi" style={{ padding: '8px 12px' }}><Star size={18} />Score de confiance {p?.score ?? 400} · {lvl.name}</div>
  </div>
  if (b.status === 'requested') return <div className="stack s16">{who}
    <div className="grid2">
      <button className="btn ghost sm" disabled={busy} onClick={() => call('respond_booking', { p_id: b.id, p_accept: false })}>Refuser</button>
      <button className="btn sm" disabled={busy} onClick={() => call('respond_booking', { p_id: b.id, p_accept: true })}>Accepter</button>
    </div></div>
  if (b.status === 'accepted') return <div className="stack">{who}<div className="notice">Demande acceptée. {name} doit maintenant payer ; vous serez prévenu ici.</div></div>
  if (b.status === 'paid') return <div className="stack s16">{who}
    <div className="card stack center">
      <h2 className="h3">Saisissez le code donné par {name}</h2>
      <div className="field"><label htmlFor="code" className="small muted">Code à 4 chiffres</label>
        <input id="code" className="code-input" inputMode="numeric" maxLength={4} autoComplete="off" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setWrong(false) }} /></div>
      {wrong && <div className="error" role="alert">Code incorrect. Vérifiez avec {name} ({5 - (b.code_attempts || 0)} essai{5 - (b.code_attempts || 0) > 1 ? 's' : ''} restant{5 - (b.code_attempts || 0) > 1 ? 's' : ''}).</div>}
      <div className="small muted">L'emprunteur vous le donne une fois le matériel en main. C'est ce code qui déclenche votre versement.</div>
    </div>
    <button className="btn" disabled={busy || code.length !== 4} onClick={async () => { const ok = await call('confirm_handover', { p_id: b.id, p_code: code }); if (ok === false) setWrong(true) }}>Valider la remise</button>
  </div>
  if (b.status === 'ongoing') return <div className="stack s16">{who}
    <div className="notice">Location en cours. Retour prévu le {frDate(b.end_date, true)}. Votre versement de {fcfa(b.owner_payout)} est dû.</div>
    <label className="row" style={{ minHeight: 44 }}><input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#0F3D2E' }} /><span>Le matériel a été rendu en retard</span></label>
    {showProblem && <div className="field"><label htmlFor="pb">Décrivez le problème (casse, pièce manquante…)</label><textarea id="pb" value={problem} onChange={e => setProblem(e.target.value)} /></div>}
    <button className="btn" disabled={busy || (showProblem && !problem.trim())} onClick={() => call('confirm_return', { p_id: b.id, p_late: late, p_problem: showProblem ? problem : '' })}>{showProblem ? 'Envoyer le signalement' : 'Valider le retour en bon état'}</button>
    <button className="link-btn" onClick={() => setShowProblem(!showProblem)}>{showProblem ? 'Finalement, tout va bien' : 'Signaler un problème'}</button>
  </div>
  if (b.status === 'dispute') return <div className="stack">{who}<div className="notice">Votre signalement est transmis à alma : « {b.problem} »</div></div>
  if (b.status === 'done') return <div className="stack">{who}<div className="notice">Location terminée. Versement : {fcfa(b.owner_payout)}.</div></div>
  return <div className="stack">{who}<div className="notice">Cette demande est {b.status === 'refused' ? 'refusée' : 'annulée'}.</div></div>
}

function ReviewForm({ who, ini, avatar, tags, note, busy, onSend }: { who: string; ini: string; avatar?: string; tags: string[]; note: string; busy: boolean; onSend: (s: number, t: string[], c: string) => void }) {
  const [stars, setStars] = useState(0)
  const [sel, setSel] = useState<string[]>([])
  const [comment, setComment] = useState('')
  return <div className="card stack s16">
    <div className="stack center" style={{ alignItems: 'center' }}>
      <Avatar src={avatar} className="lg">{ini}</Avatar><div className="bold" style={{ fontSize: 17 }}>Votre avis sur {who}</div>
      <Stars value={stars} onChange={setStars} />
    </div>
    <div className="stack s8"><div className="bold">Qu'est-ce qui s'est bien passé ?</div>
      <div className="row wrap" style={{ gap: 8 }}>{tags.map(t => { const on = sel.includes(t); return <button key={t} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setSel(on ? sel.filter(x => x !== t) : [...sel, t])}>{t}</button> })}</div></div>
    <div className="field"><label htmlFor="cm">Un mot pour les autres (facultatif)</label><textarea id="cm" maxLength={600} value={comment} onChange={e => setComment(e.target.value)} /></div>
    <div className="small soft">{note}</div>
    <button className="btn" disabled={busy || stars === 0} onClick={() => onSend(stars, sel, comment)}>Envoyer mon avis</button>
  </div>
}
