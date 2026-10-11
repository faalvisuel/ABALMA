import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { borrowerLevel, compressImage, initials, ownerLevel } from '../lib/util'
import { Avatar, ErrorBox, Header, Icon, Page } from '../components/ui'

export default function Profile() {
  const { user, profile, refresh, signOut } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ first_name: profile?.first_name || '', last_name: profile?.last_name || '', quartier: profile?.quartier || '', job: profile?.job || '' })
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const set = (k: string) => (e: any) => { setF({ ...f, [k]: e.target.value }); setOk(false) }

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null)
    const { error } = await supabase.from('profiles').update(f).eq('id', user.id)
    if (error) return setErr(errMsg(error))
    await refresh(); setOk(true)
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setErr(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setErr('Choisissez une image JPG, PNG ou WebP.')
    if (file.size > 5 * 1024 * 1024) return setErr('La photo doit faire 5 Mo maximum.')

    setUploadingAvatar(true)
    let path: string | null = null
    try {
      const image = await compressImage(file, 512, 0.84)
      path = `${user.id}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, image, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      if (profileError) throw profileError

      const previousPath = profile?.avatar_url?.split('/storage/v1/object/public/avatars/')[1]
      await refresh()
      if (previousPath?.startsWith(`${user.id}/`)) await supabase.storage.from('avatars').remove([decodeURIComponent(previousPath)])
    } catch (error) {
      if (path) await supabase.storage.from('avatars').remove([path])
      setErr(errMsg(error))
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function removeAvatar() {
    setErr(null); setUploadingAvatar(true)
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    if (error) { setErr(errMsg(error)); setUploadingAvatar(false); return }
    const previousPath = profile?.avatar_url?.split('/storage/v1/object/public/avatars/')[1]
    await refresh()
    if (previousPath?.startsWith(`${user.id}/`)) await supabase.storage.from('avatars').remove([decodeURIComponent(previousPath)])
    setUploadingAvatar(false)
  }

  const link = (to: string, t: string, d: string) => <Link to={to} className="card row" style={{ padding: '12px 14px', color: 'inherit' }}>
    <div className="stack s2 grow"><div className="bold">{t}</div><div className="small soft">{d}</div></div><Icon name="right" size={18} /></Link>

  return <Page>
    <Header title="Mon profil" back="/" />
    <div className="card row"><div className="avatar-control">
      <label className="avatar-upload" htmlFor="avatar-file" aria-label="Modifier la photo de profil">
        <Avatar src={profile?.avatar_url} className="lg">{initials(profile?.first_name, profile?.last_name)}</Avatar>
        <span className="avatar-edit"><Icon name="cam" size={16} />{uploadingAvatar ? 'Envoi…' : 'Modifier'}</span>
        <input id="avatar-file" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={uploadingAvatar} onChange={uploadAvatar} />
      </label>
      {profile?.avatar_url && <button className="link-btn small" type="button" disabled={uploadingAvatar} onClick={removeAvatar}>Supprimer</button>}
      <div className="tiny muted">JPG, PNG ou WebP · 5 Mo max.</div>
    </div>
      <div className="stack s2 grow"><div className="bold" style={{ fontSize: 17 }}>{profile?.first_name} {profile?.last_name}</div><div className="small muted">{user.email}</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          <span className={'pill' + (profile?.verified ? '' : ' warn')}>{profile?.verified ? 'Identité vérifiée' : 'Identité à vérifier'}</span>
          <span className="pill">Emprunteur {borrowerLevel(profile?.score ?? 400).name.toLowerCase()}</span>
          <span className="pill">Loueur {ownerLevel(profile).name.toLowerCase()}</span>
        </div></div></div>
    <ErrorBox msg={err} />
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
      {ok && <div className="notice" role="status">Informations enregistrées.</div>}
      <button className="btn sm">Enregistrer</button>
    </form>
    <button className="btn ghost sm" onClick={async () => { await signOut(); nav('/') }}>Se déconnecter</button>
  </Page>
}
