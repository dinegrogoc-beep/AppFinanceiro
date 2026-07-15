import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import PageHeader from '../components/PageHeader'
import { todayISO } from '../lib/format'

export default function Trucks() {
  const trucks = useLiveQuery(() => db.trucks.toArray(), [])
  const drivers = useLiveQuery(() => db.drivers.toArray(), [])
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [placa, setPlaca] = useState('')
  const [chassi, setChassi] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState('')
  const [kmAtual, setKmAtual] = useState('')
  const [motoristaId, setMotoristaId] = useState('')

  function driverName(id?: number) {
    return drivers?.find((d) => d.id === id)?.nome
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!placa.trim() || !kmAtual) return
    await db.trucks.add({
      placa: placa.trim().toUpperCase(),
      chassi: chassi.trim(),
      modelo: modelo.trim(),
      ano: ano ? Number(ano) : undefined,
      kmAtual: Number(kmAtual),
      motoristaId: motoristaId ? Number(motoristaId) : undefined,
      createdAt: todayISO(),
    })
    setPlaca('')
    setChassi('')
    setModelo('')
    setAno('')
    setKmAtual('')
    setMotoristaId('')
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Caminhões"
        action={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-full bg-sky-500 px-3 py-1 text-sm font-medium text-slate-950"
          >
            {showForm ? 'Cancelar' : '+ Novo'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleAdd} className="mx-4 mt-4 space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Placa</label>
              <input
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                className="w-full rounded-lg bg-slate-800 px-3 py-2 uppercase"
                placeholder="ABC1D23"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Ano</label>
              <input
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                type="number"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
                placeholder="2020"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Modelo</label>
            <input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              placeholder="Ex: Volvo FH 540"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Chassi</label>
            <input
              value={chassi}
              onChange={(e) => setChassi(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              placeholder="Número do chassi"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Km atual</label>
            <input
              value={kmAtual}
              onChange={(e) => setKmAtual(e.target.value)}
              type="number"
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              placeholder="150000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Motorista</label>
            <select
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
            >
              <option value="">Sem motorista definido</option>
              {drivers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full rounded-lg bg-sky-500 py-2 font-medium text-slate-950">
            Salvar
          </button>
        </form>
      )}

      <div className="space-y-2 p-4">
        {trucks?.length === 0 && (
          <p className="mt-8 text-center text-slate-500">Nenhum caminhão cadastrado ainda.</p>
        )}
        {trucks?.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/caminhoes/${t.id}`)}
            className="block w-full rounded-xl bg-slate-900 p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{t.placa}</p>
              <p className="text-sm text-slate-400">{t.kmAtual.toLocaleString('pt-BR')} km</p>
            </div>
            <p className="text-sm text-slate-400">
              {t.modelo} {t.ano ? `· ${t.ano}` : ''}
            </p>
            {t.motoristaId && (
              <p className="mt-1 text-sm text-sky-400">{driverName(t.motoristaId)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
