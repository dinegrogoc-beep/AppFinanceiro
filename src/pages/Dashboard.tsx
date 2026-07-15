import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import PageHeader from '../components/PageHeader'
import AlertBadge from '../components/AlertBadge'
import { computeMaintenanceAlerts } from '../lib/alerts'
import { formatCurrency } from '../lib/format'

export default function Dashboard() {
  const trucks = useLiveQuery(() => db.trucks.toArray(), [])
  const records = useLiveQuery(() => db.maintenanceRecords.toArray(), [])
  const trips = useLiveQuery(() => db.trips.toArray(), [])
  const expenses = useLiveQuery(() => db.expenses.toArray(), [])
  const navigate = useNavigate()

  const totalFrete = trips?.reduce((sum, t) => sum + t.freteValor, 0) ?? 0
  const totalRepasse =
    trips?.reduce((sum, t) => sum + (t.freteValor * (t.percentualMotorista ?? 0)) / 100, 0) ?? 0
  const totalDespesas = expenses?.reduce((sum, e) => sum + e.valor, 0) ?? 0
  const saldoGeral = totalFrete - totalRepasse - totalDespesas

  return (
    <div>
      <PageHeader title="FrotaControl" />

      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Saldo geral da frota</p>
          <p className={`text-2xl font-semibold ${saldoGeral >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(saldoGeral)}
          </p>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Frete: {formatCurrency(totalFrete)}</span>
            <span>Despesas: {formatCurrency(totalRepasse + totalDespesas)}</span>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-400">Caminhões</h2>
          {trucks?.length === 0 && (
            <div className="rounded-xl bg-slate-900 p-4 text-center text-slate-500">
              <p>Nenhum caminhão cadastrado ainda.</p>
              <button
                onClick={() => navigate('/caminhoes')}
                className="mt-2 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-medium text-slate-950"
              >
                Cadastrar caminhão
              </button>
            </div>
          )}
          <div className="space-y-2">
            {trucks?.map((truck) => {
              const alerts = records ? computeMaintenanceAlerts(truck, records) : []
              const worst = alerts[0]
              return (
                <button
                  key={truck.id}
                  onClick={() => navigate(`/caminhoes/${truck.id}`)}
                  className="block w-full rounded-xl bg-slate-900 p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{truck.placa}</p>
                    <p className="text-sm text-slate-400">{truck.kmAtual.toLocaleString('pt-BR')} km</p>
                  </div>
                  {worst && worst.level !== 'ok' ? (
                    <div className="mt-1 flex items-center gap-2">
                      <AlertBadge level={worst.level} />
                      <span className="text-sm text-slate-400">{worst.label}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-400">Manutenção em dia</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
