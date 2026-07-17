import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  EXPENSE_LABELS,
  FORMA_PAGAMENTO_LABELS,
  PERCENTUAL_COMISSAO_OPCOES,
  type Abastecimento,
  type Expense,
  type ExpenseCategory,
  type FechamentoLinha,
  type FechamentoTipo,
  type FormaPagamento,
  type Freight,
  type Trip,
} from '../db'
import PageHeader from '../components/PageHeader'
import { computeFechamento } from '../lib/fechamento'
import { formatCurrency, todayISO } from '../lib/format'
import { differenceInCalendarDays, parseISO } from 'date-fns'

const EXPENSE_CATEGORIES = Object.keys(EXPENSE_LABELS) as ExpenseCategory[]
const FORMAS_PAGAMENTO = Object.keys(FORMA_PAGAMENTO_LABELS) as FormaPagamento[]

interface FreightRow {
  id?: number
  origem: string
  destino: string
  quantidadeEntregas: string
  valor: string
}
const emptyFreightRow = (): FreightRow => ({ origem: '', destino: '', quantidadeEntregas: '1', valor: '' })

interface FuelRow {
  id?: number
  data: string
  posto: string
  km: string
  litros: string
  valor: string
}
const emptyFuelRow = (data: string): FuelRow => ({ data, posto: '', km: '', litros: '', valor: '' })

interface ExpenseRow {
  id?: number
  categoria: ExpenseCategory
  valor: string
  descricao: string
  formaPagamento: FormaPagamento
}
const emptyExpenseRow = (): ExpenseRow => ({ categoria: 'outro', valor: '', descricao: '', formaPagamento: 'dinheiro' })

interface LedgerRow {
  id?: number
  descricao: string
  valor: string
  tipo: FechamentoTipo
}
const emptyLedgerRow = (): LedgerRow => ({ descricao: '', valor: '', tipo: 'receber' })

export default function TripForm() {
  const { id } = useParams()
  const isEdit = !!id
  const tripId = isEdit ? Number(id) : undefined
  const navigate = useNavigate()

  const trucks = useLiveQuery(() => db.trucks.toArray(), [])
  const drivers = useLiveQuery(() => db.drivers.toArray(), [])
  const existingTrip = useLiveQuery(() => (tripId ? db.trips.get(tripId) : undefined), [tripId])
  const existingExpenses = useLiveQuery(
    () => (tripId ? db.expenses.where('tripId').equals(tripId).toArray() : Promise.resolve<Expense[]>([])),
    [tripId],
  )
  const existingFreights = useLiveQuery(
    () => (tripId ? db.freights.where('tripId').equals(tripId).toArray() : Promise.resolve<Freight[]>([])),
    [tripId],
  )
  const existingAbastecimentos = useLiveQuery(
    () =>
      tripId ? db.abastecimentos.where('tripId').equals(tripId).toArray() : Promise.resolve<Abastecimento[]>([]),
    [tripId],
  )
  const existingLinhas = useLiveQuery(
    () =>
      tripId ? db.fechamentoLinhas.where('tripId').equals(tripId).toArray() : Promise.resolve<FechamentoLinha[]>([]),
    [tripId],
  )

  const [truckId, setTruckId] = useState('')
  const [dataInicio, setDataInicio] = useState(todayISO())
  const [dataFim, setDataFim] = useState('')
  const [kmInicial, setKmInicial] = useState('')
  const [kmFinal, setKmFinal] = useState('')
  const [observacao, setObservacao] = useState('')

  const [freightRows, setFreightRows] = useState<FreightRow[]>([emptyFreightRow()])
  const [fuelRows, setFuelRows] = useState<FuelRow[]>([])
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([emptyExpenseRow()])
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([])

  const [adiantamento, setAdiantamento] = useState('')
  const [percentualComissao, setPercentualComissao] = useState('12')
  const [valorDiaria, setValorDiaria] = useState('50')
  const [numeroDiarias, setNumeroDiarias] = useState('')
  const [apelidoFechamento, setApelidoFechamento] = useState('')
  const [apelidoTocado, setApelidoTocado] = useState(false)

  const [loaded, setLoaded] = useState(!isEdit)

  useEffect(() => {
    if (
      isEdit &&
      existingTrip &&
      existingExpenses &&
      existingFreights &&
      existingAbastecimentos &&
      existingLinhas &&
      !loaded
    ) {
      setTruckId(String(existingTrip.truckId))
      setDataInicio(existingTrip.dataInicio)
      setDataFim(existingTrip.dataFim ?? '')
      setKmInicial(existingTrip.kmInicial ? String(existingTrip.kmInicial) : '')
      setKmFinal(existingTrip.kmFinal ? String(existingTrip.kmFinal) : '')
      setObservacao(existingTrip.observacao ?? '')
      setAdiantamento(existingTrip.adiantamento ? String(existingTrip.adiantamento) : '')
      setPercentualComissao(existingTrip.percentualComissao ? String(existingTrip.percentualComissao) : '12')
      setValorDiaria(existingTrip.valorDiaria ? String(existingTrip.valorDiaria) : '50')
      setNumeroDiarias(existingTrip.numeroDiarias ? String(existingTrip.numeroDiarias) : '')
      setApelidoFechamento(existingTrip.apelidoFechamento ?? '')
      setApelidoTocado(!!existingTrip.apelidoFechamento)

      setFreightRows(
        existingFreights.length
          ? existingFreights.map((f) => ({
              id: f.id,
              origem: f.origem,
              destino: f.destino,
              quantidadeEntregas: String(f.quantidadeEntregas),
              valor: String(f.valor),
            }))
          : [emptyFreightRow()],
      )
      setFuelRows(
        existingAbastecimentos.map((a) => ({
          id: a.id,
          data: a.data,
          posto: a.posto ?? '',
          km: String(a.km),
          litros: String(a.litros),
          valor: String(a.valor),
        })),
      )
      setExpenseRows(
        existingExpenses.length
          ? existingExpenses.map((e) => ({
              id: e.id,
              categoria: e.categoria,
              valor: String(e.valor),
              descricao: e.descricao ?? '',
              formaPagamento: e.formaPagamento ?? 'dinheiro',
            }))
          : [emptyExpenseRow()],
      )
      setLedgerRows(
        existingLinhas.map((l) => ({ id: l.id, descricao: l.descricao, valor: String(l.valor), tipo: l.tipo })),
      )
      setLoaded(true)
    }
  }, [isEdit, existingTrip, existingExpenses, existingFreights, existingAbastecimentos, existingLinhas, loaded])

  // Sugere o apelido do fechamento a partir do motorista do caminhão escolhido,
  // sem sobrescrever se o usuário já digitou algo.
  useEffect(() => {
    if (apelidoTocado || !truckId || !trucks || !drivers) return
    const truck = trucks.find((t) => String(t.id) === truckId)
    const driver = drivers.find((d) => d.id === truck?.motoristaId)
    if (driver) setApelidoFechamento(driver.nome)
  }, [truckId, trucks, drivers, apelidoTocado])

  // Sugere o número de diárias a partir do intervalo de datas, sem sobrescrever edição manual.
  const [diariasTocado, setDiariasTocado] = useState(false)
  useEffect(() => {
    if (diariasTocado || !dataInicio || !dataFim) return
    const dias = differenceInCalendarDays(parseISO(dataFim), parseISO(dataInicio)) + 1
    if (dias > 0) setNumeroDiarias(String(dias))
  }, [dataInicio, dataFim, diariasTocado])

  function updateFreightRow(index: number, patch: Partial<FreightRow>) {
    setFreightRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function updateFuelRow(index: number, patch: Partial<FuelRow>) {
    setFuelRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function updateExpenseRow(index: number, patch: Partial<ExpenseRow>) {
    setExpenseRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function updateLedgerRow(index: number, patch: Partial<LedgerRow>) {
    setLedgerRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  // --- Cálculo ao vivo, usando a mesma lógica que será salva ---
  const previewTrip: Trip = {
    truckId: Number(truckId) || 0,
    dataInicio,
    createdAt: '',
    adiantamento: Number(adiantamento) || 0,
    percentualComissao: Number(percentualComissao) || 0,
    valorDiaria: Number(valorDiaria) || 0,
    numeroDiarias: Number(numeroDiarias) || 0,
  }
  const previewFreights: Freight[] = freightRows.map((r) => ({
    tripId: 0,
    origem: r.origem,
    destino: r.destino,
    quantidadeEntregas: Number(r.quantidadeEntregas) || 1,
    valor: Number(r.valor) || 0,
  }))
  const previewExpenses: Expense[] = expenseRows.map((r) => ({
    truckId: 0,
    categoria: r.categoria,
    valor: Number(r.valor) || 0,
    data: dataInicio,
  }))
  const previewFuel: Abastecimento[] = fuelRows.map((r) => ({
    tripId: 0,
    truckId: 0,
    data: r.data,
    km: Number(r.km) || 0,
    litros: Number(r.litros) || 0,
    valor: Number(r.valor) || 0,
  }))
  const previewLinhas: FechamentoLinha[] = ledgerRows.map((r) => ({
    tripId: 0,
    descricao: r.descricao,
    valor: Number(r.valor) || 0,
    tipo: r.tipo,
  }))

  const calc = computeFechamento(previewTrip, previewFreights, previewExpenses, previewFuel, previewLinhas)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!truckId || !dataInicio) return

    const truck = await db.trucks.get(Number(truckId))
    const payload = {
      truckId: Number(truckId),
      motoristaId: truck?.motoristaId,
      dataInicio,
      dataFim: dataFim || undefined,
      kmInicial: kmInicial ? Number(kmInicial) : undefined,
      kmFinal: kmFinal ? Number(kmFinal) : undefined,
      observacao: observacao.trim() || undefined,
      apelidoFechamento: apelidoFechamento.trim() || undefined,
      adiantamento: adiantamento ? Number(adiantamento) : undefined,
      percentualComissao: percentualComissao ? Number(percentualComissao) : undefined,
      valorDiaria: valorDiaria ? Number(valorDiaria) : undefined,
      numeroDiarias: numeroDiarias ? Number(numeroDiarias) : undefined,
    }

    let currentTripId = tripId
    if (isEdit && currentTripId) {
      await db.trips.update(currentTripId, payload)
    } else {
      currentTripId = await db.trips.add({ ...payload, createdAt: todayISO() })
    }

    await syncFreights(currentTripId!)
    await syncFuel(currentTripId!, Number(truckId))
    await syncExpenses(currentTripId!, Number(truckId))
    await syncLedger(currentTripId!)

    if (kmFinal && truck && Number(kmFinal) > truck.kmAtual) {
      await db.trucks.update(truck.id!, { kmAtual: Number(kmFinal) })
    }

    navigate('/viagens')
  }

  async function syncFreights(currentTripId: number) {
    const valid = freightRows.filter((r) => r.destino.trim() && Number(r.valor) > 0)
    const keepIds = new Set(valid.filter((r) => r.id).map((r) => r.id))
    if (isEdit && existingFreights) {
      for (const old of existingFreights) if (!keepIds.has(old.id)) await db.freights.delete(old.id!)
    }
    for (const r of valid) {
      const p = {
        tripId: currentTripId,
        origem: r.origem.trim(),
        destino: r.destino.trim(),
        quantidadeEntregas: Number(r.quantidadeEntregas) || 1,
        valor: Number(r.valor),
      }
      if (r.id) await db.freights.update(r.id, p)
      else await db.freights.add(p)
    }
  }

  async function syncFuel(currentTripId: number, truckIdNum: number) {
    const valid = fuelRows.filter((r) => Number(r.km) > 0 && Number(r.litros) > 0)
    const keepIds = new Set(valid.filter((r) => r.id).map((r) => r.id))
    if (isEdit && existingAbastecimentos) {
      for (const old of existingAbastecimentos) if (!keepIds.has(old.id)) await db.abastecimentos.delete(old.id!)
    }
    for (const r of valid) {
      const p = {
        tripId: currentTripId,
        truckId: truckIdNum,
        data: r.data,
        posto: r.posto.trim() || undefined,
        km: Number(r.km),
        litros: Number(r.litros),
        valor: Number(r.valor) || 0,
      }
      if (r.id) await db.abastecimentos.update(r.id, p)
      else await db.abastecimentos.add(p)
    }
  }

  async function syncExpenses(currentTripId: number, truckIdNum: number) {
    const valid = expenseRows.filter((r) => Number(r.valor) > 0)
    const keepIds = new Set(valid.filter((r) => r.id).map((r) => r.id))
    if (isEdit && existingExpenses) {
      for (const old of existingExpenses) if (!keepIds.has(old.id)) await db.expenses.delete(old.id!)
    }
    for (const r of valid) {
      const p = {
        tripId: currentTripId,
        truckId: truckIdNum,
        categoria: r.categoria,
        valor: Number(r.valor),
        data: dataInicio,
        descricao: r.descricao.trim() || undefined,
        formaPagamento: r.formaPagamento,
      }
      if (r.id) await db.expenses.update(r.id, p)
      else await db.expenses.add(p)
    }
  }

  async function syncLedger(currentTripId: number) {
    const valid = ledgerRows.filter((r) => r.descricao.trim() && Number(r.valor) > 0)
    const keepIds = new Set(valid.filter((r) => r.id).map((r) => r.id))
    if (isEdit && existingLinhas) {
      for (const old of existingLinhas) if (!keepIds.has(old.id)) await db.fechamentoLinhas.delete(old.id!)
    }
    for (const r of valid) {
      const p = { tripId: currentTripId, descricao: r.descricao.trim(), valor: Number(r.valor), tipo: r.tipo }
      if (r.id) await db.fechamentoLinhas.update(r.id, p)
      else await db.fechamentoLinhas.add(p)
    }
  }

  async function handleDelete() {
    if (!tripId) return
    if (!confirm('Remover esta viagem e todos os lançamentos dela?')) return
    await db.expenses.where('tripId').equals(tripId).delete()
    await db.freights.where('tripId').equals(tripId).delete()
    await db.abastecimentos.where('tripId').equals(tripId).delete()
    await db.fechamentoLinhas.where('tripId').equals(tripId).delete()
    await db.trips.delete(tripId)
    navigate('/viagens')
  }

  return (
    <div>
      <PageHeader title={isEdit ? 'Editar viagem' : 'Nova viagem'} back />

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {/* Dados básicos */}
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
              <label className="mb-1 block text-sm text-slate-400">Data saída</label>
              <input
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                type="date"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Data chegada</label>
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
              <label className="mb-1 block text-sm text-slate-400">Km saída</label>
              <input
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Km chegada</label>
              <input
                value={kmFinal}
                onChange={(e) => setKmFinal(e.target.value)}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Fretes */}
        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-400">Fretes (ida, volta, etc.)</p>
            <button
              type="button"
              onClick={() => setFreightRows((rs) => [...rs, emptyFreightRow()])}
              className="text-sm text-sky-400"
            >
              + adicionar
            </button>
          </div>
          {freightRows.map((row, index) => (
            <div key={index} className="space-y-2 rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={row.origem}
                  onChange={(e) => updateFreightRow(index, { origem: e.target.value })}
                  placeholder="Origem"
                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <span className="text-slate-500">→</span>
                <input
                  value={row.destino}
                  onChange={(e) => updateFreightRow(index, { destino: e.target.value })}
                  placeholder="Destino"
                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFreightRows((rs) => rs.filter((_, i) => i !== index))}
                  className="text-red-400"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <label className="text-xs text-slate-400 whitespace-nowrap">Entregas</label>
                  <input
                    value={row.quantidadeEntregas}
                    onChange={(e) => updateFreightRow(index, { quantidadeEntregas: e.target.value })}
                    type="number"
                    min="1"
                    className="w-16 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                  />
                </div>
                <input
                  value={row.valor}
                  onChange={(e) => updateFreightRow(index, { valor: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  className="w-32 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
            <span className="text-slate-400">Total frete</span>
            <span className="font-medium">{formatCurrency(calc.totalFrete)}</span>
          </div>
        </div>

        {/* Abastecimentos */}
        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-400">Abastecimentos</p>
            <button
              type="button"
              onClick={() => setFuelRows((rs) => [...rs, emptyFuelRow(dataInicio)])}
              className="text-sm text-sky-400"
            >
              + adicionar
            </button>
          </div>
          {fuelRows.map((row, index) => (
            <div key={index} className="space-y-2 rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={row.data}
                  onChange={(e) => updateFuelRow(index, { data: e.target.value })}
                  type="date"
                  className="rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <input
                  value={row.posto}
                  onChange={(e) => updateFuelRow(index, { posto: e.target.value })}
                  placeholder="Posto"
                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFuelRows((rs) => rs.filter((_, i) => i !== index))}
                  className="text-red-400"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={row.km}
                  onChange={(e) => updateFuelRow(index, { km: e.target.value })}
                  type="number"
                  placeholder="Km"
                  className="rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <input
                  value={row.litros}
                  onChange={(e) => updateFuelRow(index, { litros: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="Litros"
                  className="rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <input
                  value={row.valor}
                  onChange={(e) => updateFuelRow(index, { valor: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="R$"
                  className="rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          ))}
          {fuelRows.length > 0 && (
            <div className="space-y-1 border-t border-slate-800 pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total litros</span>
                <span>{calc.totalLitros.toLocaleString('pt-BR')} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Preço médio/litro</span>
                <span>{formatCurrency(calc.precoMedioLitro)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consumo médio</span>
                <span>{calc.consumoMedioKmL.toFixed(2)} km/L</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-400">Total combustível</span>
                <span>{formatCurrency(calc.totalValorCombustivel)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Despesas */}
        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-400">Despesas da viagem</p>
            <button
              type="button"
              onClick={() => setExpenseRows((rs) => [...rs, emptyExpenseRow()])}
              className="text-sm text-sky-400"
            >
              + adicionar
            </button>
          </div>

          {expenseRows.map((row, index) => (
            <div key={index} className="space-y-2 rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2">
                <select
                  value={row.categoria}
                  onChange={(e) => updateExpenseRow(index, { categoria: e.target.value as ExpenseCategory })}
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
                  onChange={(e) => updateExpenseRow(index, { valor: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="w-24 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setExpenseRows((rs) => rs.filter((_, i) => i !== index))}
                  className="text-red-400"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={row.formaPagamento}
                  onChange={(e) => updateExpenseRow(index, { formaPagamento: e.target.value as FormaPagamento })}
                  className="rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                >
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {FORMA_PAGAMENTO_LABELS[f]}
                    </option>
                  ))}
                </select>
                <input
                  value={row.descricao}
                  onChange={(e) => updateExpenseRow(index, { descricao: e.target.value })}
                  placeholder="Descrição (opcional)"
                  className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
            <span className="text-slate-400">Total despesas</span>
            <span className="font-medium">{formatCurrency(calc.totalDespesas)}</span>
          </div>
        </div>

        {/* Fechamento */}
        <div className="space-y-3 rounded-xl bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-400">Fechamento</p>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Saldo de</label>
            <input
              value={apelidoFechamento}
              onChange={(e) => {
                setApelidoFechamento(e.target.value)
                setApelidoTocado(true)
              }}
              placeholder="Nome ou apelido do motorista"
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Adiantamento</label>
              <input
                value={adiantamento}
                onChange={(e) => setAdiantamento(e.target.value)}
                type="number"
                step="0.01"
                placeholder="0,00"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">% comissão</label>
              <select
                value={percentualComissao}
                onChange={(e) => setPercentualComissao(e.target.value)}
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              >
                {PERCENTUAL_COMISSAO_OPCOES.map((p) => (
                  <option key={p} value={p}>
                    {p}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Valor da diária</label>
              <input
                value={valorDiaria}
                onChange={(e) => setValorDiaria(e.target.value)}
                type="number"
                step="0.01"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Nº de diárias</label>
              <input
                value={numeroDiarias}
                onChange={(e) => {
                  setNumeroDiarias(e.target.value)
                  setDiariasTocado(true)
                }}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lançamentos automáticos</p>
            <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm">
              <span>Comissão ({percentualComissao || 0}% s/ {formatCurrency(calc.baseComissao)})</span>
              <span className="font-medium text-emerald-400">{formatCurrency(calc.comissao)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm">
              <span>Diárias ({numeroDiarias || 0} × {formatCurrency(Number(valorDiaria) || 0)})</span>
              <span className="font-medium text-emerald-400">{formatCurrency(calc.totalDiarias)}</span>
            </div>
            {Number(adiantamento) > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm">
                <span>Adiantamento</span>
                <span className="font-medium text-amber-400">{formatCurrency(Number(adiantamento))}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outros lançamentos</p>
              <button
                type="button"
                onClick={() => setLedgerRows((rs) => [...rs, emptyLedgerRow()])}
                className="text-sm text-sky-400"
              >
                + adicionar
              </button>
            </div>

            {ledgerRows.map((row, index) => (
              <div key={index} className="space-y-2 rounded-lg bg-slate-800 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={row.descricao}
                    onChange={(e) => updateLedgerRow(index, { descricao: e.target.value })}
                    placeholder="Ex: Imposto de renda"
                    className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                  />
                  <input
                    value={row.valor}
                    onChange={(e) => updateLedgerRow(index, { valor: e.target.value })}
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-24 rounded-lg bg-slate-700 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setLedgerRows((rs) => rs.filter((_, i) => i !== index))}
                    className="text-red-400"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-700 p-1">
                  <button
                    type="button"
                    onClick={() => updateLedgerRow(index, { tipo: 'receber' })}
                    className={`rounded-md py-1.5 text-xs font-semibold ${
                      row.tipo === 'receber' ? 'bg-emerald-400 text-emerald-950' : 'text-slate-400'
                    }`}
                  >
                    Tem a receber
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLedgerRow(index, { tipo: 'adiantado' })}
                    className={`rounded-md py-1.5 text-xs font-semibold ${
                      row.tipo === 'adiantado' ? 'bg-amber-400 text-amber-950' : 'text-slate-400'
                    }`}
                  >
                    Já adiantado
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-slate-800 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Tem a receber</span>
              <span>{formatCurrency(calc.totalReceber)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Já adiantado</span>
              <span>{formatCurrency(calc.totalAdiantado)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-800 pt-2 text-base font-semibold">
              <span>Saldo de {apelidoFechamento || 'motorista'}</span>
              <span className={calc.saldoFinal >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatCurrency(calc.saldoFinal)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {calc.saldoFinal >= 0
                ? 'Positivo = a empresa ainda deve pro motorista.'
                : 'Negativo = motorista precisa devolver a diferença.'}
            </p>
          </div>
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
