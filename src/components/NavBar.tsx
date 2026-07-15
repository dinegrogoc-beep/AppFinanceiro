import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/caminhoes', label: 'Caminhões', icon: '🚚' },
  { to: '/viagens', label: 'Viagens', icon: '💰' },
  { to: '/motoristas', label: 'Motoristas', icon: '👤' },
]

export default function NavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 mx-auto flex max-w-lg border-t border-slate-800 bg-slate-900/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-sky-400' : 'text-slate-400'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
