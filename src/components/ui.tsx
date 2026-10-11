import { ReactNode, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CATEGORY_IMAGES, fcfa, iso, ownerLevel, shortName } from '../lib/util'

const PATHS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  plus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', left: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M7 7l10 10M17 7L7 17"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.500-7-4.500-7-9V6z"/><path d="M9 12l2.200 2.200L15 10.500"/>',
  phone: '<path d="M6 4h3l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4a2 2 0 0 1-1-2z"/>',
  nav: '<path d="M12 3l7 18-7-4-7 4z"/>', add: '<path d="M12 6v12M6 12h12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
}
export function Icon({ name, size = 22, stroke = 2 }: { name: string; size?: number; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}
    dangerouslySetInnerHTML={{ __html: PATHS[name] || '' }} />
}
export function Star({ on = true, size = 18 }: { on?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.900 1-6.100-4.400-4.300 6.100-.900z" fill={on ? '#F2C230' : '#D5DBD2'} /></svg>
}
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link to="/" className={'logo' + (inverse ? ' inverse' : '')} aria-label="alma, accueil">
    <svg className="logo-art" viewBox="91.76 348 481.48 147.99" aria-hidden="true">
      <rect x="91.76" y="348" width="147.99" height="147.99" rx="41.62" fill={inverse ? '#F5F6F2' : '#0F3D2E'} />
      <path d="M204.31,379.22c-1.48,1.32-4.47,2.49-8.95,3.49-4.31.81-10.86,2.06-19.67,3.73-6.46,1.15-12.85,2.56-19.14,4.21-6.32,1.67-12.13,4-17.42,6.99-5.31,2.97-9.55,7.03-12.71,12.18-2.99,4.98-4.47,11.46-4.47,19.41,0,8.64,1.82,15.53,5.48,20.67,3.8,5.14,8.61,8.95,14.43,11.44,5.98,2.32,12.37,3.49,19.17,3.49,8.95,0,16.92-1.91,23.88-5.74,6.96-3.97,12.61-9.19,16.92-15.67,2.71-4.04,4.72-8.34,6.06-12.9,1.24-4.23,1.67-8.65,1.67-13.06,0-13.48-3.73-39.72-5.24-38.24ZM179.53,418.29c0,6.8-1,12.61-2.99,17.42-1.99,4.64-4.55,8.45-7.7,11.44-3.16,2.82-6.65,4.98-10.46,6.48-3.66,1.32-7.13,1.99-10.46,1.99-4.98,0-9.04-1.24-12.18-3.73-3.16-2.66-4.74-6.32-4.74-10.96,0-4.14,1.08-7.37,3.23-9.69,2.32-2.49,5.31-4.4,8.97-5.74,3.64-1.32,7.63-2.39,11.94-3.23,4.31-.81,8.54-1.58,12.68-2.23,4.16-.84,7.9-1.91,11.2-3.25.19-.07.38-.14.57-.24l-.07,1.75Z" fill="#F2C230" />
      <path d="M345.05,425.84c0-7.6-1.22-14.02-3.7-19.24-2.46-5.24-6.16-9.18-11.1-11.84-4.82-2.77-10.9-4.16-18.2-4.16-4.04,0-8.14.5-12.28,1.48-4.14,1-7.94,2.62-11.4,4.9-3.44,2.26-6.22,5.36-8.28,9.32-1.98,3.84-2.96,8.72-2.96,14.64l19.08,1.64c0-3.86.74-6.86,2.22-9.04,1.58-2.16,3.56-3.64,5.92-4.44,2.38-.88,4.7-1.32,6.96-1.32,3.86,0,6.96.88,9.32,2.66,2.38,1.68,3.56,4.2,3.56,7.54,0,1.48-.44,2.68-1.34,3.56-.88.78-2.66,1.48-5.32,2.08-2.56.48-6.46,1.22-11.7,2.22-3.84.68-7.64,1.52-11.38,2.5-3.76,1-7.21,2.38-10.36,4.16-3.16,1.76-5.68,4.18-7.56,7.24-1.78,2.96-2.66,6.82-2.66,11.54,0,5.14,1.08,9.24,3.26,12.29,2.26,3.06,5.12,5.32,8.58,6.8,3.56,1.38,7.36,2.08,11.4,2.08,5.32,0,10.06-1.14,14.2-3.42,4.14-2.36,7.5-5.46,10.06-9.32,2.58-3.84,4.1-8.08,4.6-12.72h.88c0,4.14-.04,8.14-.14,11.98-.1,3.86-.2,7.66-.3,11.4h18.8c0-3.36-.06-6.7-.16-10.06v-34.48ZM324.19,434.42c0,4.04-.6,7.5-1.78,10.36-1.18,2.76-2.7,5.02-4.58,6.8-1.88,1.68-3.96,2.96-6.22,3.86-2.18.78-4.24,1.18-6.22,1.18-2.96,0-5.38-.74-7.24-2.22-1.88-1.58-2.82-3.76-2.82-6.52,0-2.46.64-4.38,1.92-5.76,1.38-1.48,3.16-2.62,5.34-3.42,2.16-.78,4.54-1.42,7.1-1.92,2.56-.48,5.08-.94,7.54-1.32,2.48-.5,4.7-1.14,6.66-1.94.11-.04.23-.09.34-.14l-.04,1.04Z" fill={inverse ? '#F5F6F2' : '#10201A'} />
      <rect x="354.71" y="367.53" width="21.31" height="102.85" fill={inverse ? '#F5F6F2' : '#10201A'} />
      <path d="M492.32,399.49c-1.97-2.96-4.44-5.18-7.4-6.66-2.96-1.48-6.46-2.22-10.51-2.22-5.03,0-9.32,1.18-12.88,3.55-3.55,2.37-6.41,6.12-8.58,11.25-2.17,5.13-3.55,11.84-4.14,20.13h-1.33c.3-7.99-.3-14.55-1.78-19.68-1.38-5.13-3.65-8.93-6.81-11.4-3.06-2.57-7.05-3.85-11.99-3.85s-8.98,1.18-12.43,3.55c-3.45,2.27-6.22,5.97-8.29,11.1-1.97,5.13-3.31,11.89-4,20.27h-1.18l.44-32.85h-18.35l.15,36.7v40.99h21.31v-26.79c0-7.99.69-14.5,2.07-19.53,1.48-5.03,3.4-8.68,5.77-10.95,2.37-2.37,4.98-3.55,7.84-3.55,2.27,0,4.14.69,5.62,2.07,1.48,1.28,2.57,3.26,3.26,5.92.79,2.66,1.18,6.12,1.18,10.36v42.47h20.87v-26.79c0-7.5.69-13.76,2.07-18.8,1.38-5.03,3.26-8.83,5.62-11.4s5.08-3.85,8.14-3.85c2.27,0,4.14.69,5.62,2.07,1.48,1.28,2.57,3.35,3.26,6.22.69,2.86,1.04,6.41,1.04,10.66v41.88h21.31v-43.81c0-6.12-.49-11.4-1.48-15.84-.99-4.54-2.47-8.29-4.44-11.25Z" fill={inverse ? '#F5F6F2' : '#10201A'} />
      <path d="M554.44,470.38h18.8c0-3.36-.06-6.7-.16-10.06v-34.48c0-7.6-1.22-14.02-3.7-19.24-2.46-5.24-6.16-9.18-11.1-11.84-4.84-2.77-10.9-4.16-18.2-4.16-4.04,0-8.14.5-12.28,1.48-4.14,1-7.94,2.62-11.4,4.9-3.46,2.26-6.22,5.36-8.28,9.32-1.98,3.84-2.96,8.72-2.96,14.64l19.08,1.64c0-3.86.74-6.86,2.22-9.04,1.58-2.16,3.56-3.64,5.92-4.44,2.38-.88,4.7-1.32,6.96-1.32,3.84,0,6.96.88,9.32,2.66,2.38,1.68,3.56,4.2,3.56,7.54,0,1.48-.44,2.68-1.34,3.56-.88.78-2.66,1.48-5.32,2.08-2.56.48-6.46,1.22-11.7,2.22-3.84.68-7.64,1.52-11.4,2.5-3.74,1-7.2,2.38-10.36,4.16-3.14,1.76-5.66,4.18-7.54,7.24-1.78,2.96-2.66,6.82-2.66,11.54,0,5.14,1.08,9.24,3.26,12.29,2.26,3.06,5.12,5.32,8.58,6.8,3.54,1.38,7.34,2.08,11.4,2.08,5.32,0,10.06-1.14,14.2-3.42,4.14-2.36,7.5-5.46,10.06-9.32,2.56-3.84,4.1-8.08,4.6-12.72h.88c0,4.14-.04,8.14-.14,11.98-.1,3.86-.2,7.66-.3,11.4ZM552.22,434.42c0,4.04-.6,7.5-1.78,10.36-1.18,2.76-2.72,5.02-4.58,6.8-1.88,1.68-3.96,2.96-6.22,3.86-2.18.78-4.24,1.18-6.22,1.18-2.96,0-5.38-.74-7.26-2.22-1.86-1.58-2.8-3.76-2.8-6.52,0-2.46.64-4.38,1.92-5.76,1.38-1.48,3.16-2.62,5.32-3.42,2.18-.78,4.54-1.42,7.12-1.92,2.56-.48,5.08-.94,7.54-1.32,2.46-.5,4.68-1.14,6.66-1.94.11-.04.23-.09.34-.14l-.04,1.04Z" fill={inverse ? '#F5F6F2' : '#10201A'} />
    </svg>
  </Link>
}
export function Avatar({ src, className = '', children }: { src?: string | null; className?: string; children: ReactNode }) {
  return <div className={'avatar' + (className ? ' ' + className : '')}>{src ? <img src={src} alt="" /> : children}</div>
}
export function Header({ title, sub, back }: { title: string; sub?: string; back?: string | number }) {
  const nav = useNavigate()
  return <div className="header">
    <button className="back" aria-label="Retour" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}><Icon name="back" stroke={2.2} /></button>
    <div className="stack s2 grow">{sub && <div className="label">{sub}</div>}<h1 className="display h2">{title}</h1></div>
  </div>
}
export function BottomNav() {
  const items: [string, string, string][] = [['/', 'search', 'Explorer'], ['/reservations', 'cal', 'Réservations'], ['/publier', 'plus', 'Publier'], ['/revenus', 'card', 'Revenus']]
  return <nav className="nav" aria-label="Navigation principale">
    <div className="nav-inner">
      <div className="nav-brand"><Logo /></div>
      <div className="nav-links">
        {items.map(([to, ic, lab]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={ic} />{lab}</NavLink>)}
      </div>
      <Link className="nav-account" to="/profil"><Icon name="user" size={18} />Mon profil</Link>
    </div>
  </nav>
}
export function Page({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return <><main className={'page' + (nav ? '' : ' no-nav')}>{children}</main>{nav && <BottomNav />}</>
}
export const Spinner = () => <div className="spinner" role="status" aria-label="Chargement" />
export const ErrorBox = ({ msg }: { msg?: string | null }) => msg ? <div className="error" role="alert">{msg}</div> : null

export function Thumb({ src, small }: { src?: string; small?: boolean }) {
  return <div className={'thumb' + (small ? ' sm' : '')}>{src ? <img src={src} alt="" loading="lazy" /> : <><Icon name="cam" size={small ? 20 : 26} stroke={1.8} />{!small && 'Photo'}</>}</div>
}
export function ListingCard({ l }: { l: any }) {
  const owner = l.owner
  const lvl = ownerLevel(owner)
  const name = l.is_demo ? l.demo_owner : shortName(owner)
  return <Link to={`/annonce/${l.id}`} className="listing-card">
    <Thumb src={l.photos?.[0] || (l.is_demo ? CATEGORY_IMAGES[l.category] : undefined)} />
    <div className="stack s6 grow">
      <div className="bold" style={{ lineHeight: 1.25 }}>{l.title}</div>
      <div className="small muted">{name} · {l.quartier}{owner?.verified ? ' · Identité vérifiée' : ''}</div>
      <div className="row wrap" style={{ gap: 8 }}>
        <span className="bold green num">{fcfa(l.price)} <span className="muted" style={{ fontWeight: 500 }}>/ jour</span></span>
        {lvl.rank > 0 && <span className={'pill' + (lvl.rank === 2 ? ' gold' : '')}>{lvl.name}</span>}
        {l.is_demo && <span className="pill warn">Exemple</span>}
      </div>
    </div>
  </Link>
}
export function Row({ l, v, bold, accent }: { l: ReactNode; v: ReactNode; bold?: boolean; accent?: boolean }) {
  return <div className="row between num" style={{ fontSize: bold ? 17 : 15, fontWeight: bold ? 700 : 400 }}>
    <span className={bold ? '' : 'soft'}>{l}</span><span className={accent ? 'accent' : ''} style={{ fontWeight: bold ? 700 : 600 }}>{v}</span></div>
}
export function Note({ icon, children }: { icon: string; children: ReactNode }) {
  return <div className="row top small soft"><span className="green"><Icon name={icon} size={20} /></span><div>{children}</div></div>
}
export function Stars({ value, onChange, size = 34 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  if (!onChange) return <span className="row" style={{ gap: 2 }}>{[1, 2, 3, 4, 5].map(i => <Star key={i} on={i <= Math.round(value)} size={size} />)}</span>
  return <div className="stars" role="radiogroup" aria-label="Note sur 5">{[1, 2, 3, 4, 5].map(i =>
    <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} étoile${i > 1 ? 's' : ''}`} onClick={() => onChange(i)}><Star on={i <= value} size={size} /></button>)}</div>
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
/** Calendrier mois par mois, sélection d'une plage. busy = liste de [début, fin] au format AAAA-MM-JJ. */
export function Calendar({ busy, start, end, onChange }: { busy: [string, string][]; start: string | null; end: string | null; onChange: (s: string | null, e: string | null) => void }) {
  const today = useMemo(() => iso(new Date()), [])
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const isBusy = (d: string) => busy.some(([s, e]) => d >= s && d <= e)
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const now = new Date(); const minMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const maxMonth = new Date(now.getFullYear(), now.getMonth() + 11, 1)
  function pick(d: string) {
    if (!start || (start && end)) return onChange(d, null)
    if (d < start) return onChange(d, null)
    if (busy.some(([s]) => s > start && s <= d)) return onChange(d, null) // la plage ne peut pas enjamber un jour loué
    onChange(start, d)
  }
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)))]
  return <div className="cal">
    <div className="row between">
      <button type="button" className="icon-btn" aria-label="Mois précédent" disabled={cursor <= minMonth} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><Icon name="left" size={18} /></button>
      <div className="bold" aria-live="polite">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
      <button type="button" className="icon-btn" aria-label="Mois suivant" disabled={cursor >= maxMonth} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><Icon name="right" size={18} /></button>
    </div>
    <div className="cal-grid">
      {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(d => <div key={d} className="dow">{d}</div>)}
      {cells.map((d, i) => {
        if (!d) return <span key={'e' + i} />
        const b = isBusy(d), past = d < today
        const sel = d === start || d === end, mid = start && end && d > start && d < end
        return <button key={d} type="button" disabled={b || past} onClick={() => pick(d)}
          aria-label={`${Number(d.slice(8))} ${MONTHS[cursor.getMonth()]}${b ? ', déjà loué' : ''}`} aria-pressed={!!sel}
          className={'day' + (b ? ' busy' : '') + (sel ? ' sel' : '') + (mid ? ' mid' : '') + (d === today ? ' today' : '')}>{Number(d.slice(8))}</button>
      })}
    </div>
    <div className="small muted">Les jours barrés sont déjà loués. Touchez le premier jour, puis le dernier.</div>
  </div>
}
