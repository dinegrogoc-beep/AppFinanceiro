import type { AlertLevel } from '../lib/alerts'

const STYLES: Record<AlertLevel, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400',
  atencao: 'bg-amber-500/15 text-amber-400',
  trocar: 'bg-red-500/15 text-red-400',
}

const TEXT: Record<AlertLevel, string> = {
  ok: 'Em dia',
  atencao: 'Atenção',
  trocar: 'Trocar agora',
}

export default function AlertBadge({ level }: { level: AlertLevel }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[level]}`}>
      {TEXT[level]}
    </span>
  )
}
