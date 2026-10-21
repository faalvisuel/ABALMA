import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMsg, configured } from '../lib/supabase'
import { useAuth } from '../auth'
import { FILTERS, isReadyForPublic, ownerLevel } from '../lib/util'
import { ErrorBox, Icon, ListingCard, Logo, Page, Spinner } from '../components/ui'

const OWNER = 'owner:public_profiles(id,first_name,last_name,verified,owner_rentals,owner_rating,job)'
const FRESH_DAYS = 14

export default function Home() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!configured) { setItems([]); return }
    supabase.from('listings').select(`*, ${OWNER}`).eq('status', 'online').order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) setErr(errMsg(error)); setItems((data || []).filter(isReadyForPublic)) })
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
        ? <Link to="/profil" className="btn ghost sm home-account"><Icon name="user" size={18} />Mon profil</Link>
        : <Link to="/connexion" className="btn ghost sm home-account"><Icon name="user" size={18} />Connexion</Link>}
    </div>
    <div className="row small semi" style={{ gap: 6 }}><span className="green"><Icon name="pin" size={16} /></span>Dakar</div>
    <h1 className="display h1">Louez le matériel qu'il vous faut, près de chez vous.</h1>
    <p className="soft intro-copy">Alma met en relation des personnes qui ont du matériel avec celles qui souhaitent le louer. Parcourez les annonces, échangez avec le propriétaire et convenez ensemble des modalités.</p>
    <div className="grid2"><a href="#materiels" className="btn">Trouver du matériel</a><Link to={user ? '/publier' : '/connexion'} className="btn ghost">Proposer mon matériel</Link></div>
    <section className="card stack" aria-labelledby="how-title"><h2 id="how-title" className="h3">Comment ça marche ?</h2><ol className="steps-list"><li>Choisissez une annonce et vos dates.</li><li>Envoyez une demande au propriétaire.</li><li>Après son accord, échangez directement pour organiser la remise et le retour.</li></ol><p className="small soft">Alma facilite la mise en relation. La plateforme ne possède pas et ne conserve pas physiquement les biens. Aucun paiement n’est encaissé par Alma actuellement.</p></section>
    <section id="materiels" className="listing-results stack" aria-label="Matériel disponible">
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
    </section>
    <div className="home-cta"><h2 className="display h2">Un objet qui dort peut servir à quelqu’un.</h2><p className="soft">Créez un compte pour publier une annonce ou demander une location.</p><Link to={user ? '/publier' : '/connexion'} className="btn">{user ? 'Proposer mon matériel' : 'Créer un compte'}</Link></div>
    <footer className="legal-footer"><Link to="/cgu">Conditions d’utilisation</Link><Link to="/mentions-legales">Mentions légales</Link><Link to="/confidentialite">Confidentialité</Link><Link to="/cookies">Cookies</Link></footer>
  </Page>
}
