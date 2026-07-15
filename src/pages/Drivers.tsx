import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import PageHeader from '../components/PageHeader'
import { todayISO } from '../lib/format'

export default function Drivers() {
  const drivers = useLiveQuery(() => db.drivers.toArray(), [])
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    await db.drivers.add({ nome: nome.trim(), contato: contato.trim(), createdAt: todayISO() })
    setNome('')
    setContato('')
    setShowForm(false)
  }

  async function handleDelete(id: number) {
    const inUse = await db.trucks.where('motoristaId').equals(id).count()
    if (inUse > 0) {
      alert('Esse motorista está vinculado a um caminhão. Troque o motorista do caminhão antes de remover.')
      return
    }
    if (confirm('Remover este motorista?')) await db.drivers.delete(id)
  }

  return (
    <div>
      <PageHeader
        title="Motoristas"
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
          <div>
            <label className="mb-1 block text-sm text-slate-400">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              placeholder="Nome do motorista"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Contato</label>
            <input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
              placeholder="Telefone / WhatsApp"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-sky-500 py-2 font-medium text-slate-950">
            Salvar
          </button>
        </form>
      )}

      <div className="space-y-2 p-4">
        {drivers?.length === 0 && (
          <p className="mt-8 text-center text-slate-500">Nenhum motorista cadastrado ainda.</p>
        )}
        {drivers?.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl bg-slate-900 p-4">
            <div>
              <p className="font-medium">{d.nome}</p>
              {d.contato && <p className="text-sm text-slate-400">{d.contato}</p>}
            </div>
            <button onClick={() => handleDelete(d.id!)} className="text-sm text-red-400">
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
