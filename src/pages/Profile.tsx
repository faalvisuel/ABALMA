import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { borrowerLevel, initials, ownerLevel } from '../lib/util'
import { ErrorBox, Header, Icon, Page } from '../components/ui'

export default function Profile() {
  const { user, profile, refresh, signOut } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ first_name: profile?.first_name || '', last_name: profile?.last_name || '', quartier: profile?.quartier || '', job: profile?.job || '' })
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const set = (k: string) => (e: any) => { setF({ ...f, [k]: e.target.value }); setOk(false) }

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null)
    const { error } = await supabase.from('profiles').update(f).eq('id', user.id)
    if (error) return setErr(errMsg(error))
    await refresh(); setOk(true)
  }
  const link = (to: string, t: string, d: string) => <Link to={to} className="card row" style={{ padding: '12px 14px', color: 'inherit' }}>
    <div className="stack s2 grow"><div className="bold">{t}</div><div className="small soft">{d}</div></div><Icon name="right" size={18} /></Link>

  return <Page>
    <Header title="Mon profil" back="/" />
    <div className="card row"><div className="avatar lg">{initials(profile?.first_name, profile?.last_name)}</div>
      <div className="stack s2 grow"><div className="bold" style={{ fontSize: 17 }}>{profile?.first_name} {profile?.last_name}</div><div className="small muted">{user.email}</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          <span className={'pill' + (profile?.verified ? '' : ' warn')}>{profile?.verified ? 'Identité vérifiée' : 'Identité à vérifier'}</span>
          <span className="pill">Emprunteur {borrowerLevel(profile?.score ?? 400).name.toLowerCase()}</span>
          <span className="pill">Loueur {ownerLevel(profile).name.toLowerCase()}</span>
        </div></div></div>
    {link('/score', 'Score de confiance', `${profile?.score ?? 400} points · vos réductions et avantages`)}
    {link('/mes-annonces', 'Mes annonces', 'Gérer mon matériel et voir mon niveau de loueur')}
    {profile?.is_admin && link('/admin', 'Administration', 'Utilisateurs, annonces, réservations et litiges')}
    <form className="card stack s16" onSubmit={save}>
      <h2 className="h3">Mes informations</h2>
      <div className="grid2">
        <div className="field"><label htmlFor="fn">Prénom</label><input id="fn" required value={f.first_name} onChange={set('first_name')} /></div>
        <div className="field"><label htmlFor="ln">Nom</label><input id="ln" required value={f.last_name} onChange={set('last_name')} /></div>
      </div>
      <div className="field"><label htmlFor="qt">Quartier</label><input id="qt" value={f.quartier} onChange={set('quartier')} /></div>
      <div className="field"><label htmlFor="jb">Activité</label><input id="jb" placeholder="Ex. Vidéaste" value={f.job} onChange={set('job')} /></div>
      <ErrorBox msg={err} />
      {ok && <div className="notice" role="status">Informations enregistrées.</div>}
      <button className="btn sm">Enregistrer</button>
    </form>
    <button className="btn ghost sm" onClick={async () => { await signOut(); nav('/') }}>Se déconnecter</button>
  </Page>
}
