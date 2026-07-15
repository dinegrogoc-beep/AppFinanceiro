import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { MaintenanceRecord, MaintenanceType, Tire, Truck } from '../db'
import { MAINTENANCE_LABELS } from '../db'

export type AlertLevel = 'ok' | 'atencao' | 'trocar'

export interface MaintenanceAlert {
  tipo: MaintenanceType
  label: string
  level: AlertLevel
  kmRestante?: number
  diasRestantes?: number
  ultimoRegistro?: MaintenanceRecord
}

export interface TireAlert {
  tire: Tire
  level: AlertLevel
  kmRestante?: number
  diasRestantes?: number
}

// Abaixo desse percentual do intervalo restante, já entra em "atenção"
const WARNING_THRESHOLD = 0.15

function levelFromRatio(ratio: number | undefined): AlertLevel {
  if (ratio === undefined) return 'ok'
  if (ratio <= 0) return 'trocar'
  if (ratio <= WARNING_THRESHOLD) return 'atencao'
  return 'ok'
}

function worse(a: AlertLevel, b: AlertLevel): AlertLevel {
  const rank: Record<AlertLevel, number> = { ok: 0, atencao: 1, trocar: 2 }
  return rank[a] >= rank[b] ? a : b
}

function kmDateAlert(
  kmAtual: number,
  dataBase: string,
  kmBase: number,
  intervaloKm?: number,
  intervaloDias?: number,
): { level: AlertLevel; kmRestante?: number; diasRestantes?: number } {
  let kmRestante: number | undefined
  let diasRestantes: number | undefined
  let level: AlertLevel = 'ok'

  if (intervaloKm) {
    kmRestante = kmBase + intervaloKm - kmAtual
    level = worse(level, levelFromRatio(kmRestante / intervaloKm))
  }

  if (intervaloDias) {
    const diasPassados = differenceInCalendarDays(new Date(), parseISO(dataBase))
    diasRestantes = intervaloDias - diasPassados
    level = worse(level, levelFromRatio(diasRestantes / intervaloDias))
  }

  return { level, kmRestante, diasRestantes }
}

/**
 * Para cada tipo de manutenção, olha o último registro do caminhão e calcula
 * quanto falta (em km e em dias) até o próximo serviço, usando o intervalo
 * configurado naquele registro.
 */
export function computeMaintenanceAlerts(
  truck: Truck,
  records: MaintenanceRecord[],
): MaintenanceAlert[] {
  const byType = new Map<MaintenanceType, MaintenanceRecord[]>()
  for (const r of records) {
    if (r.truckId !== truck.id) continue
    const list = byType.get(r.tipo) ?? []
    list.push(r)
    byType.set(r.tipo, list)
  }

  const alerts: MaintenanceAlert[] = []

  for (const [tipo, list] of byType) {
    const last = [...list].sort((a, b) => b.data.localeCompare(a.data))[0]
    if (!last) continue

    const { level, kmRestante, diasRestantes } = kmDateAlert(
      truck.kmAtual,
      last.data,
      last.km,
      last.intervaloKm,
      last.intervaloDias,
    )
    if (kmRestante === undefined && diasRestantes === undefined) continue

    alerts.push({ tipo, label: MAINTENANCE_LABELS[tipo], level, kmRestante, diasRestantes, ultimoRegistro: last })
  }

  return alerts.sort((a, b) => {
    const rank: Record<AlertLevel, number> = { trocar: 0, atencao: 1, ok: 2 }
    return rank[a.level] - rank[b.level]
  })
}

/**
 * Calcula o alerta de troca de cada pneu ativo do caminhão, com base no km
 * rodado e nos dias passados desde que aquele pneu específico entrou em
 * serviço (a posição atual dele não afeta essa conta — rodízio só move o
 * pneu, não reinicia a vida útil).
 */
export function computeTireAlerts(truck: Truck, tires: Tire[]): TireAlert[] {
  const alerts: TireAlert[] = []

  for (const tire of tires) {
    if (tire.truckId !== truck.id || tire.status !== 'ativo') continue
    if (!tire.intervaloKm && !tire.intervaloDias) continue

    const { level, kmRestante, diasRestantes } = kmDateAlert(
      truck.kmAtual,
      tire.dataInstalacao,
      tire.kmInstalacao,
      tire.intervaloKm,
      tire.intervaloDias,
    )

    alerts.push({ tire, level, kmRestante, diasRestantes })
  }

  return alerts.sort((a, b) => {
    const rank: Record<AlertLevel, number> = { trocar: 0, atencao: 1, ok: 2 }
    return rank[a.level] - rank[b.level]
  })
}
