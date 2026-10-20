import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, errMsg, googleProviderEnabled } from '../lib/supabase'
import { useAuth } from '../auth'
import { ErrorBox, Logo, Page, Spinner } from '../components/ui'

export const TERMS_VERSION = '2026-10-19-v1'

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const next = sp.get('suite') || '/'
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [f, setF] = useState({ email: '', password: '', first_name: '', last_name: '', quartier: '', job: '' })
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [oauthPending, setOauthPending] = useState(() => sessionStorage.getItem('alma_google_terms_pending') === '1')
  const recovery = window.location.hash.includes('type=recovery')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    if (!user || recovery) return
    if (sessionStorage.getItem('alma_google_terms_pending') === '1') {
      sessionStorage.removeItem('alma_google_terms_pending')
      setOauthPending(false)
      // The user checked the terms before leaving for Google; record that consent after OAuth returns.
      void (async () => {
        await supabase.rpc('accept_current_terms')
        nav(next, { replace: true })
      })()
      return
    }
    nav(next, { replace: true })
  }, [user?.id, recovery, next, nav])

  async function google() {
    if (!acceptedTerms) return setErr('Veuillez accepter les conditions et la politique de confidentialité avant de continuer avec Google.')
    setErr(null); setInfo(null); setBusy(true)
    const googleEnabled = await Promise.race([
      googleProviderEnabled(),
      new Promise<null>(resolve => window.setTimeout(() => resolve(null), 8000)),
    ])
    if (googleEnabled === false) {
      setBusy(false)
      return setErr('La connexion Google n’est pas encore activée dans Supabase. Le bouton sera disponible après la configuration du fournisseur Google.')
    }
    try {
      // Ask Supabase for the provider URL first, then navigate only after receiving it.
      // This prevents a slow/hung request from leaving the button disabled indefinitely.
      const result = await Promise.race([
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/connexion?suite=${encodeURIComponent(next)}`,
            skipBrowserRedirect: true,
          },
        }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('La demande de connexion Google prend trop de temps. Vérifiez votre connexion et réessayez.')), 15000)),
      ])
      if (result.error) throw result.error
      if (!result.data.url) throw new Error('Supabase n’a pas renvoyé de lien Google. Vérifiez la configuration du fournisseur Google.')
      sessionStorage.setItem('alma_google_terms_pending', '1')
      setOauthPending(true)
      window.location.assign(result.data.url)
    } catch (error) {
      sessionStorage.removeItem('alma_google_terms_pending')
      setOauthPending(false); setBusy(false); setErr(errMsg(error))
    }
  }

  async function finishPassword(e: FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)
    if (error) return setErr(errMsg(error))
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
    nav(next, { replace: true })
  }

  if (recovery && authLoading) return <Page nav={false}><Spinner /></Page>
  if (user && recovery) return <Page nav={false}><Logo /><h1 className="display h1">Choisir un nouveau mot de passe</h1>
    <form className="stack s16" onSubmit={finishPassword}><div className="field"><label htmlFor="newpw">Nouveau mot de passe</label><input id="newpw" type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div><ErrorBox msg={err} /><button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button></form>
  </Page>
  if (user) return <Page nav={false}><Logo /><p className="soft">Connexion en cours…</p><Spinner /></Page>

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null); setInfo(null); setBusy(true)
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: `${window.location.origin}/connexion` })
      setBusy(false)
      if (error) return setErr(errMsg(error))
      return setInfo('Si cette adresse correspond à un compte, un lien de réinitialisation va être envoyé.')
    }
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
      setBusy(false)
      if (error) return setErr(errMsg(error))
      nav(next, { replace: true })
    } else {
      if (!acceptedTerms) { setBusy(false); return setErr('Vous devez accepter les conditions d’utilisation et la politique de confidentialité.') }
      const acceptedAt = new Date().toISOString()
      const { data, error } = await supabase.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: { data: { first_name: f.first_name.trim(), last_name: f.last_name.trim(), quartier: f.quartier.trim(), job: f.job.trim(), terms_accepted_version: TERMS_VERSION, terms_accepted_at: acceptedAt } },
      })
      setBusy(false)
      if (error) return setErr(errMsg(error))
      if (!data.session) return setInfo('Compte créé. Ouvrez le lien reçu par e-mail pour le confirmer, puis connectez-vous.')
      nav(next, { replace: true })
    }
  }

  return <Page nav={false}>
    <Logo />
    <h1 className="display h1">{mode === 'in' ? 'Connexion' : mode === 'reset' ? 'Réinitialiser mon mot de passe' : 'Créer un compte'}</h1>
    <p className="soft">{mode === 'in' ? 'Retrouvez vos réservations et vos annonces.' : mode === 'reset' ? 'Recevez un lien par e-mail pour choisir un nouveau mot de passe.' : 'Un seul compte pour emprunter et pour louer votre matériel.'}</p>
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
      {mode !== 'reset' && <div className="field"><label htmlFor="pw">Mot de passe</label><input id="pw" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} />
        {mode === 'up' && <div className="hint">6 caractères au minimum.</div>}</div>}
    {mode !== 'reset' && <label className="consent-row"><input type="checkbox" required={mode === 'up'} checked={acceptedTerms} onChange={e => { setAcceptedTerms(e.target.checked); if (e.target.checked) setErr(null) }} /><span>J’accepte les <a href="/cgu" target="_blank" rel="noreferrer">conditions d’utilisation</a> et reconnais avoir lu la <a href="/confidentialite" target="_blank" rel="noreferrer">politique de confidentialité</a>. Cette acceptation est nécessaire avant de continuer avec Google.</span></label>}
      <ErrorBox msg={err} />
      {info && <div className="notice" role="status">{info}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Un instant…' : mode === 'in' ? 'Se connecter' : mode === 'reset' ? 'Envoyer le lien' : 'Créer mon compte'}</button>
    </form>
    {mode !== 'reset' && <>
      <div className="auth-divider"><span>ou</span></div>
      <button type="button" className="btn google-btn" disabled={busy || oauthPending} onClick={google}><span className="google-mark" aria-hidden="true">G</span>{busy || oauthPending ? 'Redirection vers Google…' : 'Continuer avec Google'}</button>
    </>}
    {mode === 'in' && <button className="link-btn" onClick={() => { setMode('reset'); setErr(null); setInfo(null) }}>Mot de passe oublié ?</button>}
    <div className="auth-legal-links"><a href="/mentions-legales">Mentions légales</a><a href="/cookies">Cookies</a></div>
    <button className="link-btn" onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setAcceptedTerms(false); setErr(null); setInfo(null) }}>
      {mode === 'up' ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
    </button>
  </Page>
}
