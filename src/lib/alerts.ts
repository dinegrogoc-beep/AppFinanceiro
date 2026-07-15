import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { MaintenanceRecord, MaintenanceType, Truck } from '../db'
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

    let kmRestante: number | undefined
    let diasRestantes: number | undefined
    let level: AlertLevel = 'ok'

    if (last.intervaloKm) {
      kmRestante = last.km + last.intervaloKm - truck.kmAtual
      const ratio = kmRestante / last.intervaloKm
      level = worse(level, levelFromRatio(ratio))
    }

    if (last.intervaloDias) {
      const diasPassados = differenceInCalendarDays(new Date(), parseISO(last.data))
      diasRestantes = last.intervaloDias - diasPassados
      const ratio = diasRestantes / last.intervaloDias
      level = worse(level, levelFromRatio(ratio))
    }

    if (kmRestante === undefined && diasRestantes === undefined) continue

    alerts.push({
      tipo,
      label: MAINTENANCE_LABELS[tipo],
      level,
      kmRestante,
      diasRestantes,
      ultimoRegistro: last,
    })
  }

  return alerts.sort((a, b) => {
    const rank: Record<AlertLevel, number> = { trocar: 0, atencao: 1, ok: 2 }
    return rank[a.level] - rank[b.level]
  })
}
