import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errMsg, configured } from '../lib/supabase'
import { useAuth } from '../auth'
import { CATEGORIES, CATEGORY_HINTS, FILTERS, isReadyForPublic, ownerLevel } from '../lib/util'
import { ErrorBox, Icon, ListingCard, Logo, Spinner } from '../components/ui'

const OWNER = 'owner:public_profiles(id,first_name,last_name,verified,owner_rentals,owner_rating,job)'
const FRESH_DAYS = 14

const CATEGORY_ICONS: Record<string, string> = {
  'Audiovisuel': 'cam',
  'Bricolage et outils': 'tool',
  'Maison et énergie': 'bolt',
  'Événement et fête': 'party',
  'Sport et loisirs': 'bike',
  'Autre': 'box',
}

const STEPS = [
  { title: 'Cherchez le matériel', text: 'Parcourez les annonces par catégorie ou par mot-clé, puis trouvez ce qui vous convient près de chez vous.' },
  { title: 'Demandez des dates', text: 'Choisissez la période qui vous arrange et envoyez une demande au propriétaire.' },
  { title: 'Recevez son accord', text: 'Le propriétaire accepte ou refuse. Vous échangez directement pour organiser la remise.' },
  { title: 'Récupérez et rendez', text: 'Utilisez le matériel, puis rendez-le à la date convenue. Le code à 4 chiffres confirme la remise.' },
]

const FAQ = [
  { q: 'Est-ce que je paie sur Alma ?', a: 'Non. Alma ne traite aucun paiement et n’encaisse ni le prix de location ni la caution. Le prix affiché est indicatif : le paiement se règle directement entre le propriétaire et l’emprunteur, selon les modalités qu’ils conviennent ensemble.' },
  { q: 'Qui fixe le prix et la caution ?', a: 'C’est le propriétaire. Il indique un prix par jour et, s’il le souhaite, une caution. Ces montants servent de repère pour l’échange entre les deux personnes.' },
  { q: 'Faut-il être informaticien pour utiliser Alma ?', a: 'Non. Tout se fait avec des boutons et des formulaires simples : chercher, choisir des dates, envoyer une demande, publier une annonce. Chaque étape est expliquée à l’écran.' },
  { q: 'Comment savoir si la personne est fiable ?', a: 'Alma permet de vérifier son identité avant de louer ou de publier. Les profils affichent les avis reçus après une location, le nombre de locations et des repères de confiance pour vous aider à décider.' },
  { q: 'Que se passe-t-il en cas de problème ?', a: 'Documentez la situation et parlez-en directement avec l’autre personne. Alma peut examiner les signalements et modérer les comptes, sans se substituer aux recours prévus par la loi.' },
  { q: 'Puis-je proposer mon matériel ?', a: 'Oui. Créez un compte, faites vérifier votre identité, ajoutez 3 à 5 photos réelles et publiez gratuitement. Vous choisissez vous-même votre prix et vos disponibilités.' },
]

export default function Home() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState(false)

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
      return (lvl === 2 ? 300 : 0) + (fresh ? 200 : 0) + lvl * 20 + Number(l.owner?.owner_rating || 0) + (l.is_demo ? -50 : 0)
    }
    const s = q.trim().toLowerCase()
    return (items || [])
      .filter(l => !filter || l.category === filter)
      .filter(l => !s || `${l.title} ${l.description} ${l.quartier} ${l.category_other || ''}`.toLowerCase().includes(s))
      .sort((a, b) => rank(b) - rank(a))
  }, [items, filter, q])

  const visible = expanded ? shown : shown.slice(0, 6)
  const publishTo = user ? '/publier' : '/connexion'
  const accountTo = user ? '/profil' : '/connexion'

  function chooseCategory(category: string | null) {
    setFilter(category)
    setExpanded(false)
    requestAnimationFrame(() => document.getElementById('annonces')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return <div className="landing">
    <header className="landing-header">
      <div className="landing-bar">
        <Logo />
        <nav className="landing-nav" aria-label="Sommaire de la page">
          <a href="#comment">Comment ça marche</a>
          <a href="#categories">Catégories</a>
          <a href="#confiance">Confiance</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-actions">
          <Link to={accountTo} className="btn ghost sm">{user ? 'Mon profil' : 'Connexion'}</Link>
          <Link to={publishTo} className="btn sm">Publier</Link>
        </div>
      </div>
    </header>

    <main className="landing-main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-eyebrow"><span className="hero-dot" />Location entre particuliers · Dakar</span>
          <h1 id="hero-title" className="display hero-title">Tout le matériel dont vous avez besoin, <em>près de chez vous.</em></h1>
          <p className="hero-lead">Alma met en relation des personnes qui possèdent du matériel — caméra, perceuse, sono, chaises — avec celles qui souhaitent le louer. Vous trouvez, vous échangez, vous convenez ensemble des détails. Simple, local et humain.</p>
          <div className="hero-cta">
            <a href="#annonces" className="btn">Trouver du matériel<Icon name="right" size={18} stroke={2.4} /></a>
            <Link to={publishTo} className="btn ghost">Proposer mon matériel</Link>
          </div>
          <ul className="hero-points">
            <li><span><Icon name="check" size={16} stroke={2.6} /></span>Annonces avec photos et quartier</li>
            <li><span><Icon name="shield" size={16} stroke={2.2} /></span>Identité vérifiée avant de louer</li>
            <li><span><Icon name="lock" size={16} stroke={2.2} /></span>Aucun paiement encaissé par Alma</li>
          </ul>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-glow" />
          <div className="hero-shape" />
          <div className="hero-card">
            <div className="hero-card-img"><Icon name="cam" size={46} stroke={1.4} /></div>
            <div className="stack s6">
              <div className="row between">
                <span className="pill">Audiovisuel</span>
                <span className="pill gold">Vedette</span>
              </div>
              <div className="bold" style={{ fontSize: 17 }}>Caméra vidéo professionnelle</div>
              <div className="small muted">Mermoz · Propriétaire vérifié</div>
              <div className="row between" style={{ marginTop: 2 }}>
                <span className="bold green num" style={{ fontSize: 18 }}>15 000 F <span className="muted small" style={{ fontWeight: 500 }}>/ jour</span></span>
                <span className="pill"><Icon name="check" size={13} stroke={2.5} />Disponible</span>
              </div>
            </div>
          </div>
          <div className="hero-chip chip-1"><span className="hero-chip-icon"><Icon name="shield" size={16} stroke={2.2} /></span>Identité vérifiée</div>
          <div className="hero-chip chip-2"><span className="hero-chip-icon"><Icon name="cal" size={16} stroke={2.2} /></span>Vos dates, votre accord</div>
          <div className="hero-chip chip-3"><span className="hero-chip-icon"><Icon name="chat" size={16} stroke={2.2} /></span>Échange direct</div>
        </div>
      </section>

      <section className="landing-stats" aria-label="Les repères Alma">
        <div className="landing-stat"><span className="stat-icon"><Icon name="pin" size={20} /></span><div><strong>Dakar, quartier par quartier</strong><span>Des objets utiles tout près de chez vous.</span></div></div>
        <div className="landing-stat"><span className="stat-icon"><Icon name="shield" size={20} /></span><div><strong>Des profils vérifiés</strong><span>La pièce d’identité avant de publier ou de louer.</span></div></div>
        <div className="landing-stat"><span className="stat-icon"><Icon name="card" size={20} /></span><div><strong>Zéro paiement sur Alma</strong><span>Vous convenez directement des modalités.</span></div></div>
      </section>

      <section id="comment" className="landing-section" aria-labelledby="comment-title">
        <div className="section-head">
          <span className="section-kicker">Comment ça marche</span>
          <h2 id="comment-title" className="display section-title">Louer du matériel en quatre étapes simples.</h2>
          <p className="section-sub">Pas besoin de connaître l’informatique. Chaque étape se fait directement depuis votre téléphone ou votre ordinateur.</p>
        </div>
        <ol className="steps-grid">
          {STEPS.map((s, i) => <li key={s.title} className="step-card">
            <span className="step-num">{i + 1}</span>
            <h3 className="h3">{s.title}</h3>
            <p className="small soft">{s.text}</p>
          </li>)}
        </ol>
        <div className="role-note">
          <span className="role-note-icon"><Icon name="phone" size={20} /></span>
          <p><strong>Alma n’encaisse aucun paiement.</strong> Le prix et la caution se règlent directement entre le propriétaire et l’emprunteur, après leur accord.</p>
        </div>
      </section>

      <section id="categories" className="landing-section landing-section-tint" aria-labelledby="categories-title">
        <div className="section-head">
          <span className="section-kicker">Les catégories</span>
          <h2 id="categories-title" className="display section-title">Qu’est-ce que vous cherchez aujourd’hui ?</h2>
          <p className="section-sub">Du matériel pour un tournage, un déménagement, une fête ou un chantier : il y a sûrement quelqu’un pour vous le prêter.</p>
        </div>
        <div className="category-grid">
          {CATEGORIES.map(cat => <button key={cat} type="button" className="category-card" onClick={() => chooseCategory(cat)}>
            <span className="category-icon"><Icon name={CATEGORY_ICONS[cat] || 'box'} size={24} stroke={1.8} /></span>
            <span className="category-text"><strong>{cat}</strong><span>{CATEGORY_HINTS[cat]}</span></span>
            <span className="category-arrow"><Icon name="right" size={17} stroke={2.4} /></span>
          </button>)}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="role-title">
        <div className="role-card">
          <div className="role-intro">
            <span className="section-kicker light">Le rôle d’Alma</span>
            <h2 id="role-title" className="display role-title">Alma ne loue pas le matériel. Alma vous met en relation.</h2>
            <p>Une seule application pour trouver, proposer et organiser une location entre particuliers, en toute clarté.</p>
          </div>
          <div className="role-columns">
            <div className="role-list">
              <h3 className="h3"><span className="role-badge check"><Icon name="check" size={14} stroke={2.6} /></span>Ce qu’Alma fait</h3>
              <ul>
                <li>Affiche les annonces et les photos du matériel</li>
                <li>Vous aide à trouver un objet près de chez vous</li>
                <li>Transmet vos demandes de dates au propriétaire</li>
                <li>Vérifie les identités et encadre les avis</li>
              </ul>
            </div>
            <div className="role-list">
              <h3 className="h3"><span className="role-badge cross"><Icon name="x" size={14} stroke={2.6} /></span>Ce qu’Alma ne fait pas</h3>
              <ul>
                <li>Alma ne possède pas le matériel</li>
                <li>Alma ne fixe pas les prix à votre place</li>
                <li>Alma n’encaisse pas le paiement ni la caution</li>
                <li>Alma ne garantit pas l’état des objets</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="annonces" className="landing-section landing-listings" aria-labelledby="annonces-title">
        <div className="section-head section-head-row">
          <div className="stack s8">
            <span className="section-kicker">Disponible maintenant</span>
            <h2 id="annonces-title" className="display section-title">Du matériel près de chez vous.</h2>
            <p className="section-sub">Parcourez les annonces publiées à Dakar, cherchez par mot-clé ou choisissez une catégorie.</p>
          </div>
        </div>
        <div className="search-panel">
          <div className="field">
            <label htmlFor="q">Que cherchez-vous ?</label>
            <div className="search-field">
              <Icon name="search" size={19} stroke={2.1} />
              <input id="q" type="search" placeholder="Caméra, sono, perceuse, chaises…" value={q} onChange={e => { setQ(e.target.value); setExpanded(false) }} />
            </div>
          </div>
          <div className="chips" role="group" aria-label="Filtrer par catégorie">
            {FILTERS.map(([lab, cat]) => <button key={lab} className={'chip' + (filter === cat ? ' on' : '')} aria-pressed={filter === cat} onClick={() => { setFilter(cat); setExpanded(false) }}>{lab}</button>)}
          </div>
        </div>
        <ErrorBox msg={err} />
        {items === null ? <Spinner /> : <div className="stack s16">
          <div className="results-head">
            <h3 className="h3">{shown.length} annonce{shown.length > 1 ? 's' : ''}{filter ? ` · ${FILTERS.find(f => f[1] === filter)?.[0]}` : ' près de chez vous'}</h3>
            {shown.length > 6 && <button className="link-btn" onClick={() => setExpanded(v => !v)}>{expanded ? 'Réduire la liste' : 'Voir toutes les annonces'}</button>}
          </div>
          <div className="listing-grid">
            {visible.map(l => <ListingCard key={l.id} l={l} />)}
          </div>
          {shown.length === 0 && <div className="card stack empty-state">
            <div className="bold">Aucune annonce pour l’instant</div>
            <div className="soft small">Soyez le premier à proposer ce matériel à la location.</div>
            <Link to={publishTo} className="btn">Mettre mon matériel en location</Link>
          </div>}
        </div>}
      </section>

      <section id="confiance" className="landing-section landing-section-tint" aria-labelledby="confiance-title">
        <div className="section-head">
          <span className="section-kicker">Confiance et sécurité</span>
          <h2 id="confiance-title" className="display section-title">Des repères clairs avant de vous engager.</h2>
          <p className="section-sub">Alma met en place des règles simples pour que chacun sache à qui il a affaire et comment se déroule une location.</p>
        </div>
        <div className="trust-grid">
          <article className="trust-card"><span className="trust-icon"><Icon name="shield" size={23} stroke={1.9} /></span><h3 className="h3">Identité vérifiée</h3><p className="small soft">Avant de publier ou de louer, chaque personne peut faire vérifier sa pièce d’identité par l’équipe Alma.</p></article>
          <article className="trust-card"><span className="trust-icon"><Icon name="cam" size={23} stroke={1.9} /></span><h3 className="h3">Annonces encadrées</h3><p className="small soft">3 à 5 photos réelles, une description et un quartier. Les annonces peuvent être examinées et retirées si besoin.</p></article>
          <article className="trust-card"><span className="trust-icon"><Icon name="spark" size={23} stroke={1.9} /></span><h3 className="h3">Avis après location</h3><p className="small soft">Propriétaires et emprunteurs se notent après une location terminée, pour aider les prochains utilisateurs.</p></article>
          <article className="trust-card"><span className="trust-icon"><Icon name="lock" size={23} stroke={1.9} /></span><h3 className="h3">Code de remise</h3><p className="small soft">Un code à 4 chiffres confirme que la remise a bien eu lieu. Il ne remplace ni un paiement ni un accord écrit.</p></article>
        </div>
      </section>

      <section id="faq" className="landing-section" aria-labelledby="faq-title">
        <div className="section-head">
          <span className="section-kicker">Questions fréquentes</span>
          <h2 id="faq-title" className="display section-title">Tout ce qu’il faut savoir, simplement.</h2>
          <p className="section-sub">Les réponses aux questions que se posent les personnes qui découvrent Alma.</p>
        </div>
        <div className="faq-list">
          {FAQ.map(item => <details key={item.q} className="faq-item">
            <summary>{item.q}<span className="faq-plus" aria-hidden="true">+</span></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className="landing-section landing-cta-section" aria-labelledby="cta-title">
        <div className="cta-card">
          <div className="cta-copy">
            <h2 id="cta-title" className="display cta-title">Un objet qui dort peut servir à quelqu’un.</h2>
            <p>Créez votre compte pour trouver du matériel ou mettre le vôtre en location. C’est gratuit et sans engagement.</p>
          </div>
          <div className="cta-actions">
            <Link to={user ? '/publier' : '/connexion'} className="btn cta-primary">{user ? 'Proposer mon matériel' : 'Créer un compte'}<Icon name="right" size={18} stroke={2.4} /></Link>
            <a href="#annonces" className="btn ghost cta-secondary">Explorer les annonces</a>
          </div>
        </div>
      </section>
    </main>

    <footer className="landing-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Logo />
          <p>Alma facilite la location de matériel entre particuliers à Dakar. La plateforme ne possède pas les objets et n’encaisse aucun paiement.</p>
        </div>
        <div className="footer-col">
          <h3 className="label">Découvrir</h3>
          <a href="#comment">Comment ça marche</a>
          <a href="#categories">Catégories</a>
          <a href="#annonces">Annonces</a>
          <a href="#faq">Questions fréquentes</a>
        </div>
        <div className="footer-col">
          <h3 className="label">Mon compte</h3>
          <Link to={accountTo}>{user ? 'Mon profil' : 'Connexion'}</Link>
          <Link to={publishTo}>Publier un objet</Link>
          <Link to="/reservations">Mes réservations</Link>
          <Link to="/revenus">Suivi des locations</Link>
        </div>
        <div className="footer-col">
          <h3 className="label">Informations</h3>
          <Link to="/cgu">Conditions d’utilisation</Link>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/confidentialite">Confidentialité</Link>
          <Link to="/cookies">Cookies</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Alma · Location de matériel entre particuliers à Dakar.</span>
        <a href="#hero-title">Revenir en haut</a>
      </div>
    </footer>
  </div>
}
