import Dexie, { type EntityTable } from 'dexie'

export type MaintenanceType =
  | 'oleo'
  | 'filtro_oleo'
  | 'filtro_ar'
  | 'revisao'
  | 'borracharia'
  | 'lavagem'
  | 'outro'

export const MAINTENANCE_LABELS: Record<MaintenanceType, string> = {
  oleo: 'Troca de óleo',
  filtro_oleo: 'Filtro de óleo',
  filtro_ar: 'Filtro de ar',
  revisao: 'Revisão',
  borracharia: 'Borracharia',
  lavagem: 'Lavagem',
  outro: 'Outro',
}

// Intervalo padrão sugerido (km e dias) por tipo — o usuário pode ajustar em cada registro.
export const MAINTENANCE_DEFAULT_INTERVAL: Record<MaintenanceType, { km?: number; dias?: number }> = {
  oleo: { km: 10000, dias: 180 },
  filtro_oleo: { km: 10000, dias: 180 },
  filtro_ar: { km: 20000, dias: 365 },
  revisao: { km: 20000, dias: 180 },
  borracharia: {},
  lavagem: {},
  outro: {},
}

export type TireUnit = 'cavalo' | 'carreta'

export const TIRE_UNIT_LABELS: Record<TireUnit, string> = {
  cavalo: 'Cavalo',
  carreta: 'Carreta',
}

export type TireEventType = 'instalacao' | 'rodizio' | 'remocao'

export interface Tire {
  id?: number
  truckId: number
  identificador?: string // nº de fogo / código do pneu
  marca?: string
  unidade: TireUnit
  posicao: number // slot dentro da unidade (1..N)
  status: 'ativo' | 'removido'
  dataInstalacao: string // quando entrou em serviço (início de vida)
  kmInstalacao: number // km do caminhão nesse momento
  intervaloKm?: number
  intervaloDias?: number
  observacao?: string
  dataRemocao?: string
  kmRemocao?: number
}

export interface TireEvent {
  id?: number
  tireId: number
  truckId: number
  data: string
  km: number
  tipo: TireEventType
  deUnidade?: TireUnit
  dePosicao?: number
  paraUnidade?: TireUnit
  paraPosicao?: number
  observacao?: string
}

export type ExpenseCategory =
  | 'combustivel'
  | 'pedagio'
  | 'carga_descarga'
  | 'pneu'
  | 'oleo'
  | 'filtro_oleo'
  | 'filtro_ar'
  | 'borracharia'
  | 'lavagem'
  | 'peca'
  | 'conserto'
  | 'repasse_motorista'
  | 'outro'

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  combustivel: 'Combustível',
  pedagio: 'Pedágio',
  carga_descarga: 'Carga/Descarga',
  pneu: 'Pneu',
  oleo: 'Óleo',
  filtro_oleo: 'Filtro de óleo',
  filtro_ar: 'Filtro de ar',
  borracharia: 'Borracharia',
  lavagem: 'Lavagem',
  peca: 'Peça',
  conserto: 'Conserto',
  repasse_motorista: 'Repasse ao motorista',
  outro: 'Outro',
}

export interface Driver {
  id?: number
  nome: string
  contato?: string
  createdAt: string
}

export interface Truck {
  id?: number
  placa: string
  chassi?: string
  modelo?: string
  ano?: number
  kmAtual: number
  motoristaId?: number
  qtdPosicoesCavalo: number
  qtdPosicoesCarreta: number
  createdAt: string
}

export interface MaintenanceRecord {
  id?: number
  truckId: number
  tipo: MaintenanceType
  data: string // ISO date da troca/serviço
  km: number // km do caminhão na data do serviço
  custo?: number
  intervaloKm?: number
  intervaloDias?: number
  observacao?: string
}

export interface Trip {
  id?: number
  truckId: number
  motoristaId?: number
  dataInicio: string
  dataFim?: string
  origem?: string
  destino?: string
  freteValor: number
  percentualMotorista?: number
  kmInicial?: number
  kmFinal?: number
  observacao?: string
  createdAt: string
}

export interface Expense {
  id?: number
  tripId?: number
  truckId: number
  categoria: ExpenseCategory
  valor: number
  data: string
  descricao?: string
}

class FrotaDB extends Dexie {
  drivers!: EntityTable<Driver, 'id'>
  trucks!: EntityTable<Truck, 'id'>
  maintenanceRecords!: EntityTable<MaintenanceRecord, 'id'>
  trips!: EntityTable<Trip, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  tires!: EntityTable<Tire, 'id'>
  tireEvents!: EntityTable<TireEvent, 'id'>

  constructor() {
    super('frota-control-db')
    this.version(1).stores({
      drivers: '++id, nome',
      trucks: '++id, placa, motoristaId',
      maintenanceRecords: '++id, truckId, tipo, data',
      trips: '++id, truckId, motoristaId, dataInicio',
      expenses: '++id, tripId, truckId, categoria, data',
    })
    this.version(2)
      .stores({
        drivers: '++id, nome',
        trucks: '++id, placa, motoristaId',
        maintenanceRecords: '++id, truckId, tipo, data',
        trips: '++id, truckId, motoristaId, dataInicio',
        expenses: '++id, tripId, truckId, categoria, data',
        tires: '++id, truckId, unidade, status',
        tireEvents: '++id, tireId, truckId, data',
      })
      .upgrade((tx) =>
        tx
          .table('trucks')
          .toCollection()
          .modify((truck) => {
            truck.qtdPosicoesCavalo ??= 10
            truck.qtdPosicoesCarreta ??= 12
          }),
      )
  }
}

export const db = new FrotaDB()
