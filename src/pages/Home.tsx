import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../auth'
import { FILTERS, ownerLevel } from '../lib/util'
import { ErrorBox, Icon, ListingCard, Logo, Page, Spinner, Star } from '../components/ui'

const OWNER = 'owner:profiles(id,first_name,last_name,verified,owner_rentals,owner_rating,job)'
const FRESH_DAYS = 14

export default function Home() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<any[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('listings').select(`*, ${OWNER}`).eq('status', 'online').order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) setErr(errMsg(error)); setItems(data || []) })
  }, [])

  const shown = useMemo(() => {
    const now = Date.now()
    const rank = (l: any) => {
      const lvl = ownerLevel(l.owner).rank
      const fresh = !l.is_demo && now - new Date(l.created_at).getTime() < FRESH_DAYS * 86400000
      // Vedette en tête, puis coup de pouce aux annonces récentes, puis note
      return (lvl === 2 ? 300 : 0) + (fresh ? 200 : 0) + lvl * 20 + Number(l.owner?.owner_rating || 0) + (l.is_demo ? -50 : 0)
    }
    const s = q.trim().toLowerCase()
    return (items || [])
      .filter(l => !filter || l.category === filter)
      .filter(l => !s || `${l.title} ${l.description} ${l.quartier} ${l.category_other || ''}`.toLowerCase().includes(s))
      .sort((a, b) => rank(b) - rank(a))
  }, [items, filter, q])

  return <Page>
    <div className="row between">
      <Logo />
      {user
        ? <Link to="/score" className="score-pill" aria-label="Mon score de confiance"><Star size={16} />Score {profile?.score ?? 400}</Link>
        : <Link to="/connexion" className="score-pill"><Icon name="user" size={16} />Connexion</Link>}
    </div>
    <div className="row small semi" style={{ gap: 6 }}><span className="green"><Icon name="pin" size={16} /></span>Dakar</div>
    <h1 className="display h1">Louez le matériel qu'il vous faut, près de chez vous.</h1>
    <div className="field">
      <label htmlFor="q">Que cherchez-vous ?</label>
      <input id="q" type="search" placeholder="Caméra, sono, perceuse, chaises…" value={q} onChange={e => setQ(e.target.value)} />
    </div>
    <div className="chips" role="group" aria-label="Filtrer par catégorie">
      {FILTERS.map(([lab, cat]) => <button key={lab} className={'chip' + (filter === cat ? ' on' : '')} aria-pressed={filter === cat} onClick={() => setFilter(cat)}>{lab}</button>)}
    </div>
    <ErrorBox msg={err} />
    {items === null ? <Spinner /> : <div className="stack">
      <h2 className="h3">{shown.length} annonce{shown.length > 1 ? 's' : ''}{filter ? ` · ${FILTERS.find(f => f[1] === filter)?.[0]}` : ' près de chez vous'}</h2>
      {shown.map(l => <ListingCard key={l.id} l={l} />)}
      {shown.length === 0 && <div className="card stack">
        <div className="bold">Aucune annonce pour l'instant</div>
        <div className="soft small">Soyez le premier à proposer ce matériel à la location.</div>
        <Link to="/publier" className="btn">Mettre mon matériel en location</Link>
      </div>}
    </div>}
    <div className="center small"><Link to={user ? '/profil' : '/connexion'} className="semi">{user ? 'Mon profil' : 'Créer un compte'}</Link></div>
  </Page>
}
