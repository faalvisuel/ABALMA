import { FormEvent, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { ErrorBox, Logo, Page } from '../components/ui'

export default function AuthPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const next = sp.get('suite') || '/'
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [f, setF] = useState({ email: '', password: '', first_name: '', last_name: '', quartier: '', job: '' })
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })

  if (user) return <Navigate to={next} replace />

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null); setInfo(null); setBusy(true)
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
      setBusy(false)
      if (error) return setErr(errMsg(error))
      nav(next, { replace: true })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: { data: { first_name: f.first_name.trim(), last_name: f.last_name.trim(), quartier: f.quartier.trim(), job: f.job.trim() } },
      })
      setBusy(false)
      if (error) return setErr(errMsg(error))
      if (!data.session) return setInfo('Compte créé. Ouvrez le lien reçu par e-mail pour le confirmer, puis connectez-vous.')
      nav(next, { replace: true })
    }
  }

  return <Page nav={false}>
    <Logo />
    <h1 className="display h1">{mode === 'in' ? 'Connexion' : 'Créer un compte'}</h1>
    <p className="soft">{mode === 'in' ? 'Retrouvez vos réservations et vos annonces.' : 'Un seul compte pour emprunter et pour louer votre matériel.'}</p>
    <form className="stack s16" onSubmit={submit}>
      {mode === 'up' && <>
        <div className="grid2">
          <div className="field"><label htmlFor="fn">Prénom</label><input id="fn" required autoComplete="given-name" value={f.first_name} onChange={set('first_name')} /></div>
          <div className="field"><label htmlFor="ln">Nom</label><input id="ln" required autoComplete="family-name" value={f.last_name} onChange={set('last_name')} /></div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="qt">Quartier</label><input id="qt" required placeholder="Ex. Mermoz" value={f.quartier} onChange={set('quartier')} /></div>
          <div className="field"><label htmlFor="jb">Activité (facultatif)</label><input id="jb" placeholder="Ex. Vidéaste" value={f.job} onChange={set('job')} /></div>
        </div>
      </>}
      <div className="field"><label htmlFor="em">E-mail</label><input id="em" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></div>
      <div className="field"><label htmlFor="pw">Mot de passe</label><input id="pw" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} />
        {mode === 'up' && <div className="hint">6 caractères au minimum.</div>}</div>
      <ErrorBox msg={err} />
      {info && <div className="notice" role="status">{info}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Un instant…' : mode === 'in' ? 'Se connecter' : 'Créer mon compte'}</button>
    </form>
    <button className="link-btn" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(null); setInfo(null) }}>
      {mode === 'in' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
    </button>
  </Page>
}
