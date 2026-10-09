import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { fcfa, ownerLevel } from '../lib/util'
import { ErrorBox, Icon, Page, Spinner, Star } from '../components/ui'
import { BOOKING_SELECT, BookingRow } from './Bookings'

export default function Earnings() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    supabase.from('bookings').select(BOOKING_SELECT).eq('owner_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) setErr(errMsg(error)); setRows(data || []) })
  }, [user.id])

  const all = rows || []
  const month = new Date().toISOString().slice(0, 7)
  const received = all.filter(b => ['ongoing', 'done'].includes(b.status) && (b.paid_at || '').slice(0, 7) === month).reduce((s, b) => s + b.owner_payout, 0)
  const coming = all.filter(b => b.status === 'paid').reduce((s, b) => s + b.owner_payout, 0)
  const todo = all.filter(b => ['requested', 'paid', 'ongoing'].includes(b.status))
  const rest = all.filter(b => !todo.includes(b))
  const lvl = ownerLevel(profile)

  return <Page>
    <div className="stack s2"><div className="small muted">Bonjour {profile?.first_name}</div><h1 className="display h1">Vos revenus</h1></div>
    <div className="card dark stack">
      <div className="stack s2"><div className="small muted">Dû ce mois-ci, après remise</div><div className="big num">{fcfa(received)}</div></div>
      <hr className="sep" />
      <div className="row between num"><span className="muted">À venir, après la remise</span><span className="bold accent">{fcfa(coming)}</span></div>
    </div>
    <div className="test-banner">Version de test : les paiements sont simulés, aucun versement réel n'est effectué.</div>
    <Link to="/mes-annonces" className="card row" style={{ padding: '12px 14px', color: 'inherit' }}>
      <Star size={22} /><div className="stack s2 grow"><div className="bold" style={{ fontSize: 14 }}>Loueur {lvl.name.toLowerCase()}{profile?.owner_rating ? ` · note ${String(profile.owner_rating).replace('.', ',')}` : ''}</div><div className="small soft">Voir mes annonces et mon niveau</div></div><Icon name="right" size={18} /></Link>
    <ErrorBox msg={err} />
    {rows === null ? <Spinner /> : all.length === 0 ? <div className="card stack">
      <div className="bold">Pas encore de demande</div>
      <div className="soft small">Les demandes de location de votre matériel apparaîtront ici.</div>
      <Link to="/publier" className="btn">Mettre mon matériel en location</Link>
    </div> : <>
      {todo.length > 0 && <div className="stack"><h2 className="h3">À traiter</h2>{todo.map(b => <BookingRow key={b.id} b={b} as="owner" />)}</div>}
      {rest.length > 0 && <div className="stack"><h2 className="h3">Historique</h2>{rest.map(b => <BookingRow key={b.id} b={b} as="owner" />)}</div>}
    </>}
  </Page>
}
