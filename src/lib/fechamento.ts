import type { Abastecimento, Expense, FechamentoLinha, Freight, Trip } from '../db'

export interface FechamentoCalculo {
  totalFrete: number
  totalPedagio: number
  totalDescarga: number
  baseComissao: number
  comissao: number
  totalDiarias: number
  totalDespesas: number
  totalLitros: number
  totalValorCombustivel: number
  precoMedioLitro: number
  consumoMedioKmL: number
  totalReceber: number
  totalAdiantado: number
  saldoFinal: number
}

/**
 * Calcula o fechamento de uma viagem: comissão sobre o frete líquido (descontando
 * pedágio e descarga), diárias, consumo de combustível e o saldo final devido ao
 * motorista (tudo "a receber" soma, tudo "adiantado" — incluindo o adiantamento —
 * desconta).
 */
export function computeFechamento(
  trip: Trip,
  freights: Freight[],
  expenses: Expense[],
  abastecimentos: Abastecimento[],
  linhas: FechamentoLinha[],
): FechamentoCalculo {
  const totalFrete = freights.reduce((sum, f) => sum + f.valor, 0)
  const totalPedagio = expenses
    .filter((e) => e.categoria === 'pedagio')
    .reduce((sum, e) => sum + e.valor, 0)
  const totalDescarga = expenses
    .filter((e) => e.categoria === 'carga_descarga')
    .reduce((sum, e) => sum + e.valor, 0)

  const baseComissao = totalFrete - totalPedagio - totalDescarga
  const comissao = baseComissao * ((trip.percentualComissao ?? 0) / 100)

  const totalDiarias = (trip.valorDiaria ?? 0) * (trip.numeroDiarias ?? 0)

  const totalDespesas = expenses.reduce((sum, e) => sum + e.valor, 0)

  const totalLitros = abastecimentos.reduce((sum, a) => sum + a.litros, 0)
  const totalValorCombustivel = abastecimentos.reduce((sum, a) => sum + a.valor, 0)
  const precoMedioLitro = totalLitros > 0 ? totalValorCombustivel / totalLitros : 0

  // Método "cheio a cheio": o km rodado entre o 1º e o último abastecimento foi
  // coberto pelos litros de todos os reabastecimentos, MENOS o primeiro (que
  // encheu o tanque até ali, mas ainda não tinha sido "gasto" nesse trecho).
  let consumoMedioKmL = 0
  if (abastecimentos.length > 1) {
    const ordenados = [...abastecimentos].sort((a, b) => a.km - b.km)
    const kmRodado = ordenados[ordenados.length - 1].km - ordenados[0].km
    const litrosConsumidos = totalLitros - ordenados[0].litros
    consumoMedioKmL = litrosConsumidos > 0 ? kmRodado / litrosConsumidos : 0
  }

  const totalReceber =
    comissao + totalDiarias + linhas.filter((l) => l.tipo === 'receber').reduce((sum, l) => sum + l.valor, 0)
  const totalAdiantado =
    (trip.adiantamento ?? 0) +
    linhas.filter((l) => l.tipo === 'adiantado').reduce((sum, l) => sum + l.valor, 0)

  const saldoFinal = totalReceber - totalAdiantado

  return {
    totalFrete,
    totalPedagio,
    totalDescarga,
    baseComissao,
    comissao,
    totalDiarias,
    totalDespesas,
    totalLitros,
    totalValorCombustivel,
    precoMedioLitro,
    consumoMedioKmL,
    totalReceber,
    totalAdiantado,
    saldoFinal,
  }
}
