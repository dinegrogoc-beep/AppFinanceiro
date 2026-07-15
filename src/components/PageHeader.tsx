import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  back?: boolean
  action?: React.ReactNode
}

export default function PageHeader({ title, back, action }: Props) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="-ml-1 rounded-full p-1 text-slate-400"
            aria-label="Voltar"
          >
            ←
          </button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {action}
    </header>
  )
}
