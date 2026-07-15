import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, TIRE_UNIT_LABELS, type Tire, type TireEvent, type TireUnit } from '../db'
import PageHeader from '../components/PageHeader'
import AlertBadge from '../components/AlertBadge'
import { computeTireAlerts, type TireAlert } from '../lib/alerts'
import { formatDate, todayISO } from '../lib/format'

type Panel =
  | { type: 'install'; unidade: TireUnit; posicao: number }
  | { type: 'tire'; tireId: number }
  | { type: 'move'; tireId: number }
  | null

export default function TruckTires() {
  const { id } = useParams()
  const truckId = Number(id)

  const truck = useLiveQuery(() => db.trucks.get(truckId), [truckId])
  const tires = useLiveQuery(() => db.tires.where('truckId').equals(truckId).toArray(), [truckId])
  const [panel, setPanel] = useState<Panel>(null)
  const [events, setEvents] = useState<TireEvent[]>([])

  if (!truck) return null

  const activeTires = tires?.filter((t) => t.status === 'ativo') ?? []
  const alerts = computeTireAlerts(truck, tires ?? [])
  const alertByTireId = new Map<number, TireAlert>(alerts.map((a) => [a.tire.id!, a]))

  function tireAt(unidade: TireUnit, posicao: number) {
    return activeTires.find((t) => t.unidade === unidade && t.posicao === posicao)
  }

  async function openTirePanel(tireId: number) {
    setPanel({ type: 'tire', tireId })
    setEvents(await db.tireEvents.where('tireId').equals(tireId).sortBy('data'))
  }

  function renderUnitGrid(unidade: TireUnit, qtd: number) {
    return (
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-400">{TIRE_UNIT_LABELS[unidade]}</h2>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: qtd }, (_, i) => i + 1).map((posicao) => {
            const tire = tireAt(unidade, posicao)
            const alert = tire ? alertByTireId.get(tire.id!) : undefined
            return (
              <button
                key={posicao}
                onClick={() =>
                  tire ? openTirePanel(tire.id!) : setPanel({ type: 'install', unidade, posicao })
                }
                className="rounded-lg bg-slate-900 p-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Posição {posicao}</span>
                  {alert && alert.level !== 'ok' && <AlertBadge level={alert.level} />}
                </div>
                {tire ? (
                  <p className="mt-1 text-sm font-medium">{tire.identificador || tire.marca || `Pneu ${tire.id}`}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">+ Instalar</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Pneus · ${truck.placa}`} back />

      <div className="space-y-4 p-4">
        {renderUnitGrid('cavalo', truck.qtdPosicoesCavalo)}
        {renderUnitGrid('carreta', truck.qtdPosicoesCarreta)}

        {panel?.type === 'install' && (
          <InstallForm
            truckId={truckId}
            kmAtual={truck.kmAtual}
            unidade={panel.unidade}
            posicao={panel.posicao}
            onDone={() => setPanel(null)}
            onCancel={() => setPanel(null)}
          />
        )}

        {panel?.type === 'tire' &&
          (() => {
            const tire = tires?.find((t) => t.id === panel.tireId)
            if (!tire) return null
            const alert = alertByTireId.get(tire.id!)
            return (
              <TirePanel
                tire={tire}
                alert={alert}
                events={events}
                onMove={() => setPanel({ type: 'move', tireId: tire.id! })}
                onRemoved={() => setPanel(null)}
                onClose={() => setPanel(null)}
              />
            )
          })()}

        {panel?.type === 'move' &&
          (() => {
            const tire = tires?.find((t) => t.id === panel.tireId)
            if (!tire || !truck) return null
            return (
              <MoveForm
                truck={truck}
                tire={tire}
                allTires={activeTires}
                onDone={() => setPanel(null)}
                onCancel={() => openTirePanel(tire.id!)}
              />
            )
          })()}
      </div>
    </div>
  )
}

function InstallForm({
  truckId,
  kmAtual,
  unidade,
  posicao,
  onDone,
  onCancel,
}: {
  truckId: number
  kmAtual: number
  unidade: TireUnit
  posicao: number
  onDone: () => void
  onCancel: () => void
}) {
  const [identificador, setIdentificador] = useState('')
  const [marca, setMarca] = useState('')
  const [dataInstalacao, setDataInstalacao] = useState(todayISO())
  const [kmInstalacao, setKmInstalacao] = useState(String(kmAtual))
  const [intervaloKm, setIntervaloKm] = useState(unidade === 'cavalo' ? '80000' : '')
  const [intervaloDias, setIntervaloDias] = useState(unidade === 'cavalo' ? '730' : '')
  const [observacao, setObservacao] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kmInstalacao || !dataInstalacao) return
    const tireId = await db.tires.add({
      truckId,
      identificador: identificador.trim() || undefined,
      marca: marca.trim() || undefined,
      unidade,
      posicao,
      status: 'ativo',
      dataInstalacao,
      kmInstalacao: Number(kmInstalacao),
      intervaloKm: intervaloKm ? Number(intervaloKm) : undefined,
      intervaloDias: intervaloDias ? Number(intervaloDias) : undefined,
      observacao: observacao.trim() || undefined,
    })
    await db.tireEvents.add({
      tireId: tireId!,
      truckId,
      data: dataInstalacao,
      km: Number(kmInstalacao),
      tipo: 'instalacao',
      paraUnidade: unidade,
      paraPosicao: posicao,
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-400">
        Instalar pneu · {TIRE_UNIT_LABELS[unidade]} posição {posicao}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Identificação (nº de fogo)</label>
          <input
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Marca</label>
          <input value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full rounded-lg bg-slate-800 px-3 py-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Data de instalação</label>
          <input
            value={dataInstalacao}
            onChange={(e) => setDataInstalacao(e.target.value)}
            type="date"
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Km na instalação</label>
          <input
            value={kmInstalacao}
            onChange={(e) => setKmInstalacao(e.target.value)}
            type="number"
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Trocar em quantos km</label>
          <input
            value={intervaloKm}
            onChange={(e) => setIntervaloKm(e.target.value)}
            type="number"
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
            placeholder="Deixe em branco p/ usar até estragar"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Ou em quantos dias</label>
          <input
            value={intervaloDias}
            onChange={(e) => setIntervaloDias(e.target.value)}
            type="number"
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Observação</label>
        <input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg bg-slate-800 py-2 font-medium">
          Cancelar
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-sky-500 py-2 font-medium text-slate-950">
          Salvar
        </button>
      </div>
    </form>
  )
}

function TirePanel({
  tire,
  alert,
  events,
  onMove,
  onRemoved,
  onClose,
}: {
  tire: Tire
  alert: TireAlert | undefined
  events: TireEvent[]
  onMove: () => void
  onRemoved: () => void
  onClose: () => void
}) {
  const [showRemove, setShowRemove] = useState(false)
  const [dataRemocao, setDataRemocao] = useState(todayISO())
  const [kmRemocao, setKmRemocao] = useState(String(tire.kmInstalacao))
  const [motivo, setMotivo] = useState('')

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault()
    await db.tires.update(tire.id!, {
      status: 'removido',
      dataRemocao,
      kmRemocao: Number(kmRemocao),
    })
    await db.tireEvents.add({
      tireId: tire.id!,
      truckId: tire.truckId,
      data: dataRemocao,
      km: Number(kmRemocao),
      tipo: 'remocao',
      deUnidade: tire.unidade,
      dePosicao: tire.posicao,
      observacao: motivo.trim() || undefined,
    })
    onRemoved()
  }

  return (
    <div className="space-y-3 rounded-xl bg-slate-900 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{tire.identificador || `Pneu ${tire.id}`}</p>
          <p className="text-sm text-slate-400">
            {tire.marca} · {TIRE_UNIT_LABELS[tire.unidade]} posição {tire.posicao}
          </p>
          <p className="text-sm text-slate-500">
            Instalado em {formatDate(tire.dataInstalacao)} · {tire.kmInstalacao.toLocaleString('pt-BR')} km
          </p>
          {tire.observacao && <p className="text-sm text-slate-500">{tire.observacao}</p>}
        </div>
        {alert && <AlertBadge level={alert.level} />}
      </div>

      {alert && (alert.kmRestante !== undefined || alert.diasRestantes !== undefined) && (
        <p className="text-sm text-slate-400">
          {alert.kmRestante !== undefined &&
            (alert.kmRestante > 0
              ? `Faltam ${alert.kmRestante.toLocaleString('pt-BR')} km`
              : `${Math.abs(alert.kmRestante).toLocaleString('pt-BR')} km acima do previsto`)}
          {alert.kmRestante !== undefined && alert.diasRestantes !== undefined && ' · '}
          {alert.diasRestantes !== undefined &&
            (alert.diasRestantes > 0
              ? `${alert.diasRestantes} dias restantes`
              : `${Math.abs(alert.diasRestantes)} dias em atraso`)}
        </p>
      )}

      {events.length > 0 && (
        <div className="space-y-1 border-t border-slate-800 pt-2">
          <p className="text-xs font-semibold text-slate-500">Histórico</p>
          {events.map((ev) => (
            <p key={ev.id} className="text-xs text-slate-500">
              {formatDate(ev.data)} ·{' '}
              {ev.tipo === 'instalacao' && `instalado em ${TIRE_UNIT_LABELS[ev.paraUnidade!]} ${ev.paraPosicao}`}
              {ev.tipo === 'rodizio' &&
                `movido de ${TIRE_UNIT_LABELS[ev.deUnidade!]} ${ev.dePosicao} para ${TIRE_UNIT_LABELS[ev.paraUnidade!]} ${ev.paraPosicao}`}
              {ev.tipo === 'remocao' && `removido (${ev.km.toLocaleString('pt-BR')} km)`}
            </p>
          ))}
        </div>
      )}

      {!showRemove ? (
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium">
            Fechar
          </button>
          <button onClick={onMove} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-sky-400">
            Mover / Rodízio
          </button>
          <button
            onClick={() => setShowRemove(true)}
            className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-red-400"
          >
            Remover
          </button>
        </div>
      ) : (
        <form onSubmit={handleRemove} className="space-y-2 border-t border-slate-800 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Data</label>
              <input
                value={dataRemocao}
                onChange={(e) => setDataRemocao(e.target.value)}
                type="date"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Km</label>
              <input
                value={kmRemocao}
                onChange={(e) => setKmRemocao(e.target.value)}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
          </div>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowRemove(false)} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-slate-950">
              Confirmar remoção
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function MoveForm({
  truck,
  tire,
  allTires,
  onDone,
  onCancel,
}: {
  truck: { id?: number; kmAtual: number; qtdPosicoesCavalo: number; qtdPosicoesCarreta: number }
  tire: Tire
  allTires: Tire[]
  onDone: () => void
  onCancel: () => void
}) {
  const [destino, setDestino] = useState('')
  const [data, setData] = useState(todayISO())
  const [km, setKm] = useState(String(truck.kmAtual))

  const slots: { unidade: TireUnit; posicao: number; ocupante?: Tire }[] = []
  for (let p = 1; p <= truck.qtdPosicoesCavalo; p++) {
    if (tire.unidade === 'cavalo' && tire.posicao === p) continue
    slots.push({ unidade: 'cavalo', posicao: p, ocupante: allTires.find((t) => t.unidade === 'cavalo' && t.posicao === p) })
  }
  for (let p = 1; p <= truck.qtdPosicoesCarreta; p++) {
    if (tire.unidade === 'carreta' && tire.posicao === p) continue
    slots.push({ unidade: 'carreta', posicao: p, ocupante: allTires.find((t) => t.unidade === 'carreta' && t.posicao === p) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!destino || !km) return
    const [destUnidade, destPosicaoStr] = destino.split(':') as [TireUnit, string]
    const destPosicao = Number(destPosicaoStr)
    const destTire = allTires.find((t) => t.unidade === destUnidade && t.posicao === destPosicao)

    await db.tires.update(tire.id!, { unidade: destUnidade, posicao: destPosicao })
    await db.tireEvents.add({
      tireId: tire.id!,
      truckId: tire.truckId,
      data,
      km: Number(km),
      tipo: 'rodizio',
      deUnidade: tire.unidade,
      dePosicao: tire.posicao,
      paraUnidade: destUnidade,
      paraPosicao: destPosicao,
    })

    if (destTire) {
      await db.tires.update(destTire.id!, { unidade: tire.unidade, posicao: tire.posicao })
      await db.tireEvents.add({
        tireId: destTire.id!,
        truckId: destTire.truckId,
        data,
        km: Number(km),
        tipo: 'rodizio',
        deUnidade: destTire.unidade,
        dePosicao: destTire.posicao,
        paraUnidade: tire.unidade,
        paraPosicao: tire.posicao,
      })
    }

    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-400">
        Mover {tire.identificador || `Pneu ${tire.id}`} ({TIRE_UNIT_LABELS[tire.unidade]} {tire.posicao})
      </p>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Nova posição</label>
        <select
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className="w-full rounded-lg bg-slate-800 px-3 py-2"
          required
        >
          <option value="">Selecione</option>
          {slots.map((s) => (
            <option key={`${s.unidade}:${s.posicao}`} value={`${s.unidade}:${s.posicao}`}>
              {TIRE_UNIT_LABELS[s.unidade]} {s.posicao}
              {s.ocupante ? ` (troca com ${s.ocupante.identificador || `Pneu ${s.ocupante.id}`})` : ' (vazia)'}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Data</label>
          <input value={data} onChange={(e) => setData(e.target.value)} type="date" className="w-full rounded-lg bg-slate-800 px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Km</label>
          <input value={km} onChange={(e) => setKm(e.target.value)} type="number" className="w-full rounded-lg bg-slate-800 px-3 py-2" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg bg-slate-800 py-2 font-medium">
          Cancelar
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-sky-500 py-2 font-medium text-slate-950">
          Confirmar
        </button>
      </div>
    </form>
  )
}
