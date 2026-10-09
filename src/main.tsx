import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './styles.css'
import { AuthProvider, useAuth } from './auth'
import { configured } from './lib/supabase'
import { Spinner } from './components/ui'
import Home from './pages/Home'
import ListingPage from './pages/ListingPage'
import Reserve from './pages/Reserve'
import AuthPage from './pages/AuthPage'
import Bookings from './pages/Bookings'
import BookingDetail from './pages/BookingDetail'
import Publish from './pages/Publish'
import MyListings from './pages/MyListings'
import Earnings from './pages/Earnings'
import Score from './pages/Score'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function Private({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/connexion?suite=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}

function Setup() {
  return <main className="page no-nav">
    <h1 className="display h1">Abalma n'est pas encore relié à sa base de données</h1>
    <p className="soft">Ajoutez les variables <b>VITE_SUPABASE_URL</b> et <b>VITE_SUPABASE_ANON_KEY</b> dans les réglages de l'hébergeur (ou dans un fichier <b>.env.local</b>), puis relancez la mise en ligne. Les étapes sont détaillées dans le fichier README.</p>
  </main>
}

function App() {
  if (!configured) return <div className="app"><Setup /></div>
  return <div className="app">
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/annonce/:id" element={<ListingPage />} />
      <Route path="/connexion" element={<AuthPage />} />
      <Route path="/reserver/:id" element={<Private><Reserve /></Private>} />
      <Route path="/reservations" element={<Private><Bookings /></Private>} />
      <Route path="/reservation/:id" element={<Private><BookingDetail /></Private>} />
      <Route path="/publier" element={<Private><Publish /></Private>} />
      <Route path="/mes-annonces" element={<Private><MyListings /></Private>} />
      <Route path="/revenus" element={<Private><Earnings /></Private>} />
      <Route path="/score" element={<Private><Score /></Private>} />
      <Route path="/profil" element={<Private><Profile /></Private>} />
      <Route path="/admin" element={<Private><Admin /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>
)
