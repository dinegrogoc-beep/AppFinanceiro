import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import PageHeader from '../components/PageHeader'
import { computeFechamento } from '../lib/fechamento'
import { formatCurrency, formatDate } from '../lib/format'

export default function Trips() {
  const trips = useLiveQuery(() => db.trips.orderBy('dataInicio').reverse().toArray(), [])
  const trucks = useLiveQuery(() => db.trucks.toArray(), [])
  const expenses = useLiveQuery(() => db.expenses.toArray(), [])
  const freights = useLiveQuery(() => db.freights.toArray(), [])
  const abastecimentos = useLiveQuery(() => db.abastecimentos.toArray(), [])
  const fechamentoLinhas = useLiveQuery(() => db.fechamentoLinhas.toArray(), [])
  const navigate = useNavigate()

  function truckPlaca(id: number) {
    return trucks?.find((t) => t.id === id)?.placa ?? '—'
  }

  return (
    <div>
      <PageHeader
        title="Viagens"
        action={
          <button
            onClick={() => navigate('/viagens/novo')}
            className="rounded-full bg-sky-500 px-3 py-1 text-sm font-medium text-slate-950"
          >
            + Nova
          </button>
        }
      />

      <div className="space-y-2 p-4">
        {trips?.length === 0 && (
          <p className="mt-8 text-center text-slate-500">Nenhuma viagem registrada ainda.</p>
        )}
        {trips?.map((trip) => {
          const calc = computeFechamento(
            trip,
            freights?.filter((f) => f.tripId === trip.id) ?? [],
            expenses?.filter((e) => e.tripId === trip.id) ?? [],
            abastecimentos?.filter((a) => a.tripId === trip.id) ?? [],
            fechamentoLinhas?.filter((l) => l.tripId === trip.id) ?? [],
          )
          return (
            <button
              key={trip.id}
              onClick={() => navigate(`/viagens/${trip.id}`)}
              className="block w-full rounded-xl bg-slate-900 p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{truckPlaca(trip.truckId)}</p>
                <p className="text-sm text-slate-400">{formatDate(trip.dataInicio)}</p>
              </div>
              {(trip.origem || trip.destino) && (
                <p className="text-sm text-slate-400">
                  {trip.origem} {trip.origem && trip.destino ? '→' : ''} {trip.destino}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-slate-400">Frete: {formatCurrency(calc.totalFrete)}</p>
                <p className={`font-medium ${calc.saldoFinal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Saldo {trip.apelidoFechamento ? `de ${trip.apelidoFechamento}` : ''}: {formatCurrency(calc.saldoFinal)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
