import { HashRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Dashboard from './pages/Dashboard'
import Trucks from './pages/Trucks'
import TruckDetail from './pages/TruckDetail'
import Drivers from './pages/Drivers'
import Trips from './pages/Trips'
import TripForm from './pages/TripForm'

export default function App() {
  return (
    <HashRouter>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-950 text-slate-100">
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/caminhoes" element={<Trucks />} />
            <Route path="/caminhoes/:id" element={<TruckDetail />} />
            <Route path="/motoristas" element={<Drivers />} />
            <Route path="/viagens" element={<Trips />} />
            <Route path="/viagens/novo" element={<TripForm />} />
            <Route path="/viagens/:id" element={<TripForm />} />
          </Routes>
        </main>
        <NavBar />
      </div>
    </HashRouter>
  )
}
