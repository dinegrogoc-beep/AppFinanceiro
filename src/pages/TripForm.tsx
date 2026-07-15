import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, EXPENSE_LABELS, type Expense, type ExpenseCategory } from '../db'
import PageHeader from '../components/PageHeader'
import { formatCurrency, todayISO } from '../lib/format'

const EXPENSE_CATEGORIES = Object.keys(EXPENSE_LABELS) as ExpenseCategory[]

interface ExpenseRow {
  id?: number
  categoria: ExpenseCategory
  valor: string
  descricao: string
}

function emptyRow(): ExpenseRow {
  return { categoria: 'combustivel', valor: '', descricao: '' }
}

export default function TripForm() {
  const { id } = useParams()
  const isEdit = !!id
  const tripId = isEdit ? Number(id) : undefined
  const navigate = useNavigate()

  const trucks = useLiveQuery(() => db.trucks.toArray(), [])
  const existingTrip = useLiveQuery(() => (tripId ? db.trips.get(tripId) : undefined), [tripId])
  const existingExpenses = useLiveQuery(
    () => (tripId ? db.expenses.where('tripId').equals(tripId).toArray() : Promise.resolve<Expense[]>([])),
    [tripId],
  )

  const [truckId, setTruckId] = useState('')
  const [dataInicio, setDataInicio] = useState(todayISO())
  const [dataFim, setDataFim] = useState('')
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [freteValor, setFreteValor] = useState('')
  const [percentualMotorista, setPercentualMotorista] = useState('')
  const [kmInicial, setKmInicial] = useState('')
  const [kmFinal, setKmFinal] = useState('')
  const [observacao, setObservacao] = useState('')
  const [rows, setRows] = useState<ExpenseRow[]>([emptyRow()])
  const [loaded, setLoaded] = useState(!isEdit)

  useEffect(() => {
    if (isEdit && existingTrip && existingExpenses && !loaded) {
      setTruckId(String(existingTrip.truckId))
      setDataInicio(existingTrip.dataInicio)
      setDataFim(existingTrip.dataFim ?? '')
      setOrigem(existingTrip.origem ?? '')
      setDestino(existingTrip.destino ?? '')
      setFreteValor(String(existingTrip.freteValor))
      setPercentualMotorista(existingTrip.percentualMotorista ? String(existingTrip.percentualMotorista) : '')
      setKmInicial(existingTrip.kmInicial ? String(existingTrip.kmInicial) : '')
      setKmFinal(existingTrip.kmFinal ? String(existingTrip.kmFinal) : '')
      setObservacao(existingTrip.observacao ?? '')
      setRows(
        existingExpenses.length
          ? existingExpenses.map((e) => ({
              id: e.id,
              categoria: e.categoria,
              valor: String(e.valor),
              descricao: e.descricao ?? '',
            }))
          : [emptyRow()],
      )
      setLoaded(true)
    }
  }, [isEdit, existingTrip, existingExpenses, loaded])

  function updateRow(index: number, patch: Partial<ExpenseRow>) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow()])
  }

  function removeRow(index: number) {
    setRows((rs) => rs.filter((_, i) => i !== index))
  }

  const frete = Number(freteValor) || 0
  const percentual = Number(percentualMotorista) || 0
  const repasse = (frete * percentual) / 100
  const totalDespesas = rows.reduce((sum, r) => sum + (Number(r.valor) || 0), 0)
  const saldo = frete - repasse - totalDespesas

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!truckId || !freteValor || !dataInicio) return

    const truck = await db.trucks.get(Number(truckId))
    const payload = {
      truckId: Number(truckId),
      motoristaId: truck?.motoristaId,
      dataInicio,
      dataFim: dataFim || undefined,
      origem: origem.trim() || undefined,
      destino: destino.trim() || undefined,
      freteValor: frete,
      percentualMotorista: percentual || undefined,
      kmInicial: kmInicial ? Number(kmInicial) : undefined,
      kmFinal: kmFinal ? Number(kmFinal) : undefined,
      observacao: observacao.trim() || undefined,
    }

    let currentTripId = tripId
    if (isEdit && currentTripId) {
      await db.trips.update(currentTripId, payload)
    } else {
      currentTripId = await db.trips.add({ ...payload, createdAt: todayISO() })
    }

    const validRows = rows.filter((r) => Number(r.valor) > 0)
    const keepIds = new Set(validRows.filter((r) => r.id).map((r) => r.id))
    if (isEdit && existingExpenses) {
      for (const old of existingExpenses) {
        if (!keepIds.has(old.id)) await db.expenses.delete(old.id!)
      }
    }
    for (const r of validRows) {
      const expensePayload = {
        tripId: currentTripId,
        truckId: Number(truckId),
        categoria: r.categoria,
        valor: Number(r.valor),
        data: dataInicio,
        descricao: r.descricao.trim() || undefined,
      }
      if (r.id) {
        await db.expenses.update(r.id, expensePayload)
      } else {
        await db.expenses.add(expensePayload)
      }
    }

    // se informou km final, atualiza o km atual do caminhão
    if (kmFinal && truck && Number(kmFinal) > truck.kmAtual) {
      await db.trucks.update(truck.id!, { kmAtual: Number(kmFinal) })
    }

    navigate('/viagens')
  }

  async function handleDelete() {
    if (!tripId) return
    if (!confirm('Remover esta viagem e suas despesas?')) return
    await db.expenses.where('tripId').equals(tripId).delete()
    await db.trips.delete(tripId)
    navigate('/viagens')
  }

  return (
    <div>
      <PageHeader title={isEdit ? 'Editar viagem' : 'Nova viagem'} back />

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Caminhão</label>
            <select
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              required
            >
              <option value="">Selecione</option>
              {trucks?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.placa}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Data início</label>
              <input
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                type="date"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Data fim</label>
              <input
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                type="date"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Origem</label>
              <input
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Destino</label>
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Km inicial</label>
              <input
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Km final</label>
              <input
                value={kmFinal}
                onChange={(e) => setKmFinal(e.target.value)}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-400">Entrada</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Valor do frete</label>
              <input
                value={freteValor}
                onChange={(e) => setFreteValor(e.target.value)}
                type="number"
                step="0.01"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">% p/ motorista</label>
              <input
                value={percentualMotorista}
                onChange={(e) => setPercentualMotorista(e.target.value)}
                type="number"
                step="0.1"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
                placeholder="Ex: 10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-400">Despesas da viagem</p>
            <button type="button" onClick={addRow} className="text-sm text-sky-400">
              + adicionar
            </button>
          </div>

          {rows.map((row, index) => (
            <div key={index} className="space-y-2 rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2">
                <select
                  value={row.categoria}
                  onChange={(e) => updateRow(index, { categoria: e.target.value as ExpenseCategory })}
                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {EXPENSE_LABELS[c]}
                    </option>
                  ))}
                </select>
                <input
                  value={row.valor}
                  onChange={(e) => updateRow(index, { valor: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="w-24 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => removeRow(index)} className="text-red-400">
                  ✕
                </button>
              </div>
              <input
                value={row.descricao}
                onChange={(e) => updateRow(index, { descricao: e.target.value })}
                placeholder="Descrição (opcional)"
                className="w-full rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Observação geral</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2"
            rows={2}
            placeholder="Ex: quebrou o caminhão, teve que mandar pro conserto..."
          />
        </div>

        <div className="space-y-1 rounded-xl bg-slate-900 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Frete</span>
            <span>{formatCurrency(frete)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Repasse motorista ({percentual || 0}%)</span>
            <span>- {formatCurrency(repasse)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Despesas</span>
            <span>- {formatCurrency(totalDespesas)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-800 pt-1 font-semibold">
            <span>Saldo</span>
            <span className={saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(saldo)}</span>
          </div>
        </div>

        <button type="submit" className="w-full rounded-lg bg-sky-500 py-2.5 font-medium text-slate-950">
          Salvar viagem
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-red-400"
          >
            Remover viagem
          </button>
        )}
      </form>
    </div>
  )
}
