import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MAINTENANCE_LABELS, MAINTENANCE_DEFAULT_INTERVAL, type MaintenanceType } from '../db'
import PageHeader from '../components/PageHeader'
import AlertBadge from '../components/AlertBadge'
import { computeMaintenanceAlerts, computeTireAlerts } from '../lib/alerts'
import { formatDate, formatCurrency, todayISO } from '../lib/format'

const MAINTENANCE_TYPES = Object.keys(MAINTENANCE_LABELS) as MaintenanceType[]

export default function TruckDetail() {
  const { id } = useParams()
  const truckId = Number(id)
  const navigate = useNavigate()

  const truck = useLiveQuery(() => db.trucks.get(truckId), [truckId])
  const drivers = useLiveQuery(() => db.drivers.toArray(), [])
  const records = useLiveQuery(
    () => db.maintenanceRecords.where('truckId').equals(truckId).toArray(),
    [truckId],
  )

  const [showKmEdit, setShowKmEdit] = useState(false)
  const [kmAtual, setKmAtual] = useState('')

  const [showMaintForm, setShowMaintForm] = useState(false)
  const [tipo, setTipo] = useState<MaintenanceType>('oleo')
  const [data, setData] = useState(todayISO())
  const [km, setKm] = useState('')
  const [custo, setCusto] = useState('')
  const [intervaloKm, setIntervaloKm] = useState(String(MAINTENANCE_DEFAULT_INTERVAL.oleo.km ?? ''))
  const [intervaloDias, setIntervaloDias] = useState(String(MAINTENANCE_DEFAULT_INTERVAL.oleo.dias ?? ''))
  const [observacao, setObservacao] = useState('')

  const tires = useLiveQuery(() => db.tires.where('truckId').equals(truckId).toArray(), [truckId])

  if (!truck) return null

  const alerts = records ? computeMaintenanceAlerts(truck, records) : []
  const tireAlerts = tires ? computeTireAlerts(truck, tires) : []
  const tiresPrecisandoAtencao = tireAlerts.filter((a) => a.level !== 'ok').length
  const driverName = drivers?.find((d) => d.id === truck.motoristaId)?.nome

  async function handleUpdateKm(e: React.FormEvent) {
    e.preventDefault()
    if (!kmAtual) return
    await db.trucks.update(truckId, { kmAtual: Number(kmAtual) })
    setShowKmEdit(false)
    setKmAtual('')
  }

  function handleTipoChange(t: MaintenanceType) {
    setTipo(t)
    const def = MAINTENANCE_DEFAULT_INTERVAL[t]
    setIntervaloKm(def.km ? String(def.km) : '')
    setIntervaloDias(def.dias ? String(def.dias) : '')
  }

  async function handleAddMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!km || !data) return
    await db.maintenanceRecords.add({
      truckId,
      tipo,
      data,
      km: Number(km),
      custo: custo ? Number(custo) : undefined,
      intervaloKm: intervaloKm ? Number(intervaloKm) : undefined,
      intervaloDias: intervaloDias ? Number(intervaloDias) : undefined,
      observacao: observacao.trim() || undefined,
    })
    setKm('')
    setCusto('')
    setObservacao('')
    setShowMaintForm(false)
  }

  async function handleDeleteTruck() {
    if (!confirm(`Remover o caminhão ${truck!.placa}? Isso também apaga o histórico de manutenção dele.`)) return
    await db.maintenanceRecords.where('truckId').equals(truckId).delete()
    await db.trucks.delete(truckId)
    navigate('/caminhoes')
  }

  return (
    <div>
      <PageHeader title={truck.placa} back />

      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-slate-900 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">{truck.placa}</p>
              <p className="text-sm text-slate-400">
                {truck.modelo} {truck.ano ? `· ${truck.ano}` : ''}
              </p>
              {truck.chassi && <p className="text-sm text-slate-500">Chassi: {truck.chassi}</p>}
              {driverName && <p className="mt-1 text-sm text-sky-400">Motorista: {driverName}</p>}
            </div>
            <button onClick={handleDeleteTruck} className="text-sm text-red-400">
              Remover
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
            <div>
              <p className="text-xs text-slate-400">Km atual</p>
              <p className="font-medium">{truck.kmAtual.toLocaleString('pt-BR')} km</p>
            </div>
            <button
              onClick={() => setShowKmEdit((s) => !s)}
              className="rounded-full bg-sky-500 px-3 py-1 text-sm font-medium text-slate-950"
            >
              Atualizar km
            </button>
          </div>

          {showKmEdit && (
            <form onSubmit={handleUpdateKm} className="mt-3 flex gap-2">
              <input
                value={kmAtual}
                onChange={(e) => setKmAtual(e.target.value)}
                type="number"
                autoFocus
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2"
                placeholder="Novo km"
              />
              <button type="submit" className="rounded-lg bg-sky-500 px-4 font-medium text-slate-950">
                Salvar
              </button>
            </form>
          )}
        </div>

        <button
          onClick={() => navigate(`/caminhoes/${truckId}/pneus`)}
          className="flex w-full items-center justify-between rounded-xl bg-slate-900 p-4 text-left"
        >
          <div>
            <p className="font-medium">🛞 Pneus</p>
            <p className="text-sm text-slate-400">
              {tires?.filter((t) => t.status === 'ativo').length ?? 0} pneus ativos
            </p>
          </div>
          {tiresPrecisandoAtencao > 0 ? (
            <AlertBadge level="atencao" />
          ) : (
            <span className="text-slate-500">→</span>
          )}
        </button>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-400">Alertas de manutenção</h2>
          {alerts.length === 0 && (
            <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-500">
              Nenhum registro de manutenção ainda. Adicione um abaixo para começar a receber alertas.
            </p>
          )}
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.tipo} className="flex items-center justify-between rounded-xl bg-slate-900 p-3">
                <div>
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-slate-400">
                    {a.kmRestante !== undefined &&
                      (a.kmRestante > 0
                        ? `Faltam ${a.kmRestante.toLocaleString('pt-BR')} km`
                        : `${Math.abs(a.kmRestante).toLocaleString('pt-BR')} km acima do previsto`)}
                    {a.kmRestante !== undefined && a.diasRestantes !== undefined && ' · '}
                    {a.diasRestantes !== undefined &&
                      (a.diasRestantes > 0
                        ? `${a.diasRestantes} dias restantes`
                        : `${Math.abs(a.diasRestantes)} dias em atraso`)}
                  </p>
                </div>
                <AlertBadge level={a.level} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400">Histórico de manutenção</h2>
            <button
              onClick={() => setShowMaintForm((s) => !s)}
              className="rounded-full bg-sky-500 px-3 py-1 text-xs font-medium text-slate-950"
            >
              {showMaintForm ? 'Cancelar' : '+ Registrar'}
            </button>
          </div>

          {showMaintForm && (
            <form onSubmit={handleAddMaintenance} className="mb-3 space-y-3 rounded-xl bg-slate-900 p-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Tipo de serviço</label>
                <select
                  value={tipo}
                  onChange={(e) => handleTipoChange(e.target.value as MaintenanceType)}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2"
                >
                  {MAINTENANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {MAINTENANCE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Data</label>
                  <input
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    type="date"
                    className="w-full rounded-lg bg-slate-800 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Km na troca</label>
                  <input
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    type="number"
                    className="w-full rounded-lg bg-slate-800 px-3 py-2"
                    placeholder={String(truck.kmAtual)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Próxima em quantos km</label>
                  <input
                    value={intervaloKm}
                    onChange={(e) => setIntervaloKm(e.target.value)}
                    type="number"
                    className="w-full rounded-lg bg-slate-800 px-3 py-2"
                    placeholder="Ex: 80000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Ou em quantos dias</label>
                  <input
                    value={intervaloDias}
                    onChange={(e) => setIntervaloDias(e.target.value)}
                    type="number"
                    className="w-full rounded-lg bg-slate-800 px-3 py-2"
                    placeholder="Ex: 365"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Custo (opcional)</label>
                <input
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg bg-slate-800 px-3 py-2"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Observação</label>
                <input
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 px-3 py-2"
                  placeholder="Ex: marca do pneu, oficina, etc."
                />
              </div>
              <button type="submit" className="w-full rounded-lg bg-sky-500 py-2 font-medium text-slate-950">
                Salvar registro
              </button>
            </form>
          )}

          <div className="space-y-2">
            {[...(records ?? [])]
              .sort((a, b) => b.data.localeCompare(a.data))
              .map((r) => (
                <div key={r.id} className="rounded-xl bg-slate-900 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{MAINTENANCE_LABELS[r.tipo]}</p>
                    <p className="text-sm text-slate-400">{formatDate(r.data)}</p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {r.km.toLocaleString('pt-BR')} km
                    {r.custo ? ` · ${formatCurrency(r.custo)}` : ''}
                  </p>
                  {r.observacao && <p className="text-sm text-slate-500">{r.observacao}</p>}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
