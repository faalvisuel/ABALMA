import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { fcfa, STATUS_LABEL } from '../lib/util'
import { ErrorBox, Header, Page, Spinner } from '../components/ui'

export default function Admin() {
  const { profile, loading } = useAuth()
  const [tab, setTab] = useState<'users' | 'listings' | 'bookings'>('bookings')
  const [users, setUsers] = useState<any[]>([])
  const [listings, setListings] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const [u, l, b] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('listings').select('*, owner:profiles(first_name,last_name)').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, listing:listings(title), borrower:profiles!bookings_borrower_id_fkey(first_name,last_name), owner:profiles!bookings_owner_id_fkey(first_name,last_name)').order('created_at', { ascending: false }),
    ])
    setErr(u.error || l.error || b.error ? errMsg(u.error || l.error || b.error) : null)
    setUsers(u.data || []); setListings(l.data || []); setBookings(b.data || []); setReady(true)
  }, [])
  useEffect(() => { if (profile?.is_admin) load() }, [profile?.is_admin, load])

  if (loading) return <Page><Spinner /></Page>
  if (!profile?.is_admin) return <Navigate to="/" replace />

  async function run(fn: string, args: any) {
    const { error } = await supabase.rpc(fn, args)
    if (error) setErr(errMsg(error)); load()
  }
  async function removeListing(id: string) {
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) setErr(errMsg(error)); load()
  }
  const n = (p: any) => p ? `${p.first_name} ${p.last_name}` : '—'
  const disputes = bookings.filter(b => b.status === 'dispute')
  const commission = bookings.filter(b => ['paid', 'ongoing', 'done'].includes(b.status)).reduce((s, b) => s + b.commission, 0)

  return <Page>
    <Header title="Administration" back="/profil" />
    <div className="grid3">
      <div className="card stack s2" style={{ padding: 12 }}><div className="display" style={{ fontSize: 20 }}>{users.length}</div><div className="tiny muted">comptes</div></div>
      <div className="card stack s2" style={{ padding: 12 }}><div className="display" style={{ fontSize: 20 }}>{listings.filter(l => !l.is_demo).length}</div><div className="tiny muted">annonces réelles</div></div>
      <div className="card stack s2" style={{ padding: 12 }}><div className="display num" style={{ fontSize: 20 }}>{fcfa(commission)}</div><div className="tiny muted">commission (simulée)</div></div>
    </div>
    <ErrorBox msg={err} />
    {disputes.length > 0 && <div className="card stack"><h2 className="h3">{disputes.length} litige{disputes.length > 1 ? 's' : ''} à trancher</h2>
      {disputes.map(b => <div key={b.id} className="stack s8" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <div className="bold">{b.listing?.title}</div>
        <div className="small soft">Loueur : {n(b.owner)} · Emprunteur : {n(b.borrower)}</div>
        <div className="small">« {b.problem} »</div>
        <div className="grid2"><button className="btn ghost sm" onClick={() => run('admin_resolve_dispute', { p_id: b.id, p_borrower_fault: false })}>Emprunteur non fautif</button>
          <button className="btn danger sm" onClick={() => run('admin_resolve_dispute', { p_id: b.id, p_borrower_fault: true })}>Emprunteur en tort (−150)</button></div>
      </div>)}</div>}
    <div className="chips" role="tablist">
      {([['bookings', 'Réservations'], ['users', 'Utilisateurs'], ['listings', 'Annonces']] as const).map(([k, lab]) =>
        <button key={k} role="tab" aria-selected={tab === k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{lab}</button>)}
    </div>
    {!ready ? <Spinner /> : tab === 'users' ? <div className="stack">
      {users.map(u => <div key={u.id} className="card row" style={{ padding: 12 }}>
        <div className="stack s2 grow"><div className="bold">{n(u)}{u.is_admin ? ' · admin' : ''}</div>
          <div className="small muted">{u.quartier || 'Quartier non renseigné'} · score {u.score} · {u.rentals_done} empr. · {u.owner_rentals} loc.</div></div>
        <button className={'btn sm ' + (u.verified ? 'ghost' : '')} style={{ width: 'auto' }} onClick={() => run('admin_set_verified', { p_user: u.id, p_value: !u.verified })}>{u.verified ? 'Retirer' : 'Vérifier'}</button>
      </div>)}</div>
    : tab === 'listings' ? <div className="stack">
      {listings.map(l => <div key={l.id} className="card stack s8" style={{ padding: 12 }}>
        <div className="row"><div className="stack s2 grow"><div className="bold">{l.title}</div><div className="small muted">{l.is_demo ? `Exemple · ${l.demo_owner}` : n(l.owner)} · {l.quartier} · {fcfa(l.price)} / jour</div></div>
          <span className={'pill' + (l.status === 'online' ? '' : ' warn')}>{l.status === 'online' ? 'En ligne' : l.status === 'paused' ? 'En pause' : 'Masquée'}</span></div>
        <div className="grid2">
          <button className="btn ghost sm" onClick={() => run('admin_set_listing_status', { p_listing: l.id, p_status: l.status === 'hidden' ? 'online' : 'hidden' })}>{l.status === 'hidden' ? 'Remettre en ligne' : 'Masquer'}</button>
          {l.is_demo ? <button className="btn danger sm" onClick={() => removeListing(l.id)}>Supprimer l'exemple</button> : <span />}
        </div></div>)}</div>
    : <div className="card table-scroll"><table>
        <thead><tr><th>Matériel</th><th>Emprunteur</th><th>Loueur</th><th>État</th><th>Payé</th><th>Commission</th><th>Versement</th></tr></thead>
        <tbody>{bookings.map(b => <tr key={b.id}><td>{b.listing?.title}</td><td>{n(b.borrower)}</td><td>{n(b.owner)}</td><td>{STATUS_LABEL[b.status]}</td>
          <td className="num">{fcfa(b.amount_paid)}</td><td className="num">{fcfa(b.commission)}</td><td className="num">{fcfa(b.owner_payout)}</td></tr>)}
          {bookings.length === 0 && <tr><td colSpan={7}>Aucune réservation pour l'instant.</td></tr>}</tbody>
      </table></div>}
  </Page>
}
