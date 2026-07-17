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
  | 'outro'

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
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
  outro: 'Outro',
}

export type FormaPagamento = 'dinheiro' | 'cartao' | 'boleto' | 'cheque' | 'pix'

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  cheque: 'Cheque',
  pix: 'Pix',
}

export const PERCENTUAL_COMISSAO_OPCOES = [10, 11, 12, 13, 14, 15]

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
  kmInicial?: number
  kmFinal?: number
  observacao?: string
  createdAt: string

  // Fechamento
  apelidoFechamento?: string // nome/apelido a exibir no "Saldo de ___"; padrão é o nome do motorista
  adiantamento?: number
  percentualComissao?: number
  valorDiaria?: number
  numeroDiarias?: number
}

export interface Expense {
  id?: number
  tripId?: number
  truckId: number
  categoria: ExpenseCategory
  valor: number
  data: string
  descricao?: string
  formaPagamento?: FormaPagamento
}

export interface Freight {
  id?: number
  tripId: number
  descricao: string // ex: "Frete Charque", "Frete Sal"
  valor: number
}

export interface Abastecimento {
  id?: number
  tripId: number
  truckId: number
  data: string
  posto?: string
  km: number
  litros: number
  valor: number
}

export type FechamentoTipo = 'receber' | 'adiantado'

export interface FechamentoLinha {
  id?: number
  tripId: number
  descricao: string
  valor: number
  tipo: FechamentoTipo
}

class FrotaDB extends Dexie {
  drivers!: EntityTable<Driver, 'id'>
  trucks!: EntityTable<Truck, 'id'>
  maintenanceRecords!: EntityTable<MaintenanceRecord, 'id'>
  trips!: EntityTable<Trip, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  tires!: EntityTable<Tire, 'id'>
  tireEvents!: EntityTable<TireEvent, 'id'>
  freights!: EntityTable<Freight, 'id'>
  abastecimentos!: EntityTable<Abastecimento, 'id'>
  fechamentoLinhas!: EntityTable<FechamentoLinha, 'id'>

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
    this.version(3)
      .stores({
        drivers: '++id, nome',
        trucks: '++id, placa, motoristaId',
        maintenanceRecords: '++id, truckId, tipo, data',
        trips: '++id, truckId, motoristaId, dataInicio',
        expenses: '++id, tripId, truckId, categoria, data',
        tires: '++id, truckId, unidade, status',
        tireEvents: '++id, tireId, truckId, data',
        freights: '++id, tripId',
        abastecimentos: '++id, tripId, truckId, data',
        fechamentoLinhas: '++id, tripId',
      })
      .upgrade(async (tx) => {
        const trips = await tx.table('trips').toCollection().toArray()
        for (const trip of trips) {
          if (trip.freteValor) {
            await tx.table('freights').add({
              tripId: trip.id,
              descricao: 'Frete',
              valor: trip.freteValor,
            })
          }
          await tx.table('trips').update(trip.id, {
            percentualComissao: trip.percentualMotorista,
          })
        }
      })
  }
}

export const db = new FrotaDB()
