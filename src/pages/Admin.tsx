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
  const [identityDocs, setIdentityDocs] = useState<any[]>([])
  const [docLinks, setDocLinks] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const [u, l, b, d] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('listings').select('*, owner:profiles(first_name,last_name)').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, listing:listings(title), borrower:profiles!bookings_borrower_id_fkey(first_name,last_name), owner:profiles!bookings_owner_id_fkey(first_name,last_name)').order('created_at', { ascending: false }),
      supabase.from('identity_documents').select('*').order('created_at', { ascending: true }),
    ])
    setErr(u.error || l.error || b.error || d.error ? errMsg(u.error || l.error || b.error || d.error) : null)
    setUsers(u.data || []); setListings(l.data || []); setBookings(b.data || []); setIdentityDocs(d.data || []); setReady(true)
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
  async function showIdentityDocument(path: string) {
    const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(path, 600)
    if (error) return setErr(errMsg(error))
    setDocLinks(current => ({ ...current, [path]: data.signedUrl }))
  }
  async function decideIdentity(userId: string, status: 'verified' | 'rejected') {
    const { error } = await supabase.rpc('admin_set_identity_status', { p_user: userId, p_status: status })
    if (error) return setErr(errMsg(error))
    const docs = identityDocs.filter(d => d.user_id === userId)
    const paths = docs.map(d => d.storage_path)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('identity-documents').remove(paths)
      if (storageError) { setErr(`Décision enregistrée, mais suppression des copies impossible : ${errMsg(storageError)}`); load(); return }
      const { error: rowError } = await supabase.from('identity_documents').delete().eq('user_id', userId)
      if (rowError) { setErr(`Décision enregistrée, mais nettoyage du dossier impossible : ${errMsg(rowError)}`); load(); return }
    }
    setErr(null); await load()
  }
  const n = (p: any) => p ? `${p.first_name} ${p.last_name}` : '—'
  const disputes = bookings.filter(b => b.status === 'dispute')

  return <Page>
    <Header title="Administration" back="/profil" />
    <div className="grid3">
      <div className="card stack s2" style={{ padding: 12 }}><div className="display" style={{ fontSize: 20 }}>{users.length}</div><div className="tiny muted">comptes</div></div>
      <div className="card stack s2" style={{ padding: 12 }}><div className="display" style={{ fontSize: 20 }}>{listings.filter(l => !l.is_demo).length}</div><div className="tiny muted">annonces réelles</div></div>
      <div className="card stack s2" style={{ padding: 12 }}><div className="display num" style={{ fontSize: 20 }}>—</div><div className="tiny muted">paiements intégrés</div></div>
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
      {users.map(u => {
        const docs = identityDocs.filter(d => d.user_id === u.id)
        return <div key={u.id} className="card stack" style={{ padding: 14 }}>
          <div className="row top"><div className="stack s2 grow"><div className="bold">{n(u)}{u.is_admin ? ' · admin' : ''}</div>
            <div className="small muted">{u.quartier || 'Quartier non renseigné'} · score {u.score} · {u.rentals_done} empr. · {u.owner_rentals} loc.</div>
            <span className={'pill' + (u.identity_status === 'verified' ? '' : ' warn')}>Identité : {u.identity_status === 'verified' ? 'vérifiée' : u.identity_status === 'pending' ? 'à examiner' : u.identity_status === 'rejected' ? 'à corriger' : 'non vérifiée'}</span></div>
            <div className="stack s2 admin-user-actions"><button className="btn danger sm" onClick={() => run('admin_set_suspended', { p_user: u.id, p_value: !u.suspended })}>{u.suspended ? 'Réactiver' : 'Suspendre'}</button></div></div>
          {docs.length > 0 && <div className="stack s8 identity-review">
            <div className="small bold">Pièce d’identité · accès privé, liens expirant sous 10 minutes</div>
            <div className="row wrap">{docs.map(d => docLinks[d.storage_path]
              ? <a key={d.side} className="btn ghost sm" href={docLinks[d.storage_path]} target="_blank" rel="noreferrer">Ouvrir {d.side === 'front' ? 'le recto' : 'le verso'}</a>
              : <button key={d.side} type="button" className="btn ghost sm" onClick={() => showIdentityDocument(d.storage_path)}>Afficher {d.side === 'front' ? 'le recto' : 'le verso'}</button>)}</div>
            {u.identity_status === 'pending' && <div className="grid2"><button className="btn sm" onClick={() => decideIdentity(u.id, 'verified')}>Vérifier l’identité</button><button className="btn danger sm" onClick={() => decideIdentity(u.id, 'rejected')}>Demander de nouveaux documents</button></div>}
          </div>}
        </div>
      })}</div>
    : tab === 'listings' ? <div className="stack">
      {listings.map(l => <div key={l.id} className="card stack s8" style={{ padding: 12 }}>
        <div className="row"><div className="stack s2 grow"><div className="bold">{l.title}</div><div className="small muted">{l.is_demo ? `Exemple · ${l.demo_owner}` : n(l.owner)} · {l.quartier} · {fcfa(l.price)} / jour</div></div>
          <span className={'pill' + (l.status === 'online' ? '' : ' warn')}>{l.status === 'online' ? 'En ligne' : l.status === 'paused' ? 'En pause' : 'Masquée'}</span></div>
        <div className="grid2">
          <button className="btn ghost sm" onClick={() => run('admin_set_listing_status', { p_listing: l.id, p_status: l.status === 'hidden' ? 'online' : 'hidden' })}>{l.status === 'hidden' ? 'Remettre en ligne' : 'Masquer'}</button>
          {l.is_demo ? <button className="btn danger sm" onClick={() => removeListing(l.id)}>Supprimer l'exemple</button> : <span />}
        </div></div>)}</div>
    : <div className="card table-scroll"><table>
        <thead><tr><th>Matériel</th><th>Emprunteur</th><th>Loueur</th><th>État</th><th>Prix indicatif</th><th>Paiement</th></tr></thead>
        <tbody>{bookings.map(b => <tr key={b.id}><td>{b.listing?.title}</td><td>{n(b.borrower)}</td><td>{n(b.owner)}</td><td>{STATUS_LABEL[b.status]}</td>
          <td className="num">{b.price_total.toLocaleString('fr-FR')} F</td><td>Non intégré</td></tr>)}
          {bookings.length === 0 && <tr><td colSpan={6}>Aucune réservation pour l'instant.</td></tr>}</tbody>
      </table></div>}
  </Page>
}
