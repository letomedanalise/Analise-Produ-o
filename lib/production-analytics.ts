import { LancamentoProducao, LancamentoParada, Setor, Maquina, Operador, Produto, Turno, MotivoParada } from './types';

export type PeriodPreset =
  | 'hoje'
  | 'ontem'
  | 'esta_semana'
  | 'semana_passada'
  | 'este_mes'
  | 'mes_passado'
  | 'este_ano'
  | 'personalizado';

export interface PeriodRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
  prevStartDate: string;
  prevEndDate: string;
  prevLabel: string;
}

export interface DashboardFilters {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
  setorId: string;
  maquinaId: string;
  operadorId: string;
  produtoId: string;
  turnoId: string;
}

export interface ConsolidatedMetrics {
  totalBrutoKg: number;
  totalLiquidoKg: number;
  totalRefugoKg: number;
  totalPerdaKg: number;
  totalDescarteKg: number;
  percentualPerda: number; // (totalPerda / totalBruto) * 100
  percentualRefugo: number; // (totalRefugo / totalBruto) * 100
  percentualDescarteTotal: number; // (totalDescarte / totalBruto) * 100
  percentualAproveitamento: number; // (totalLiquido / totalBruto) * 100
  tempoTrabalhadoMinutos: number;
  tempoParadoMinutos: number;
  horasProdutivas: number;
  produtividadeKgHora: number;
  quantidadeUnidades: number;
  horasProdutivasCorteSolda: number;
  produtividadeUnidadesHora: number;
  totalLancamentos: number;
}

export interface MetricComparison {
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null; // null if previous === 0
  trend: 'up' | 'down' | 'equal';
  isFavorable: boolean | null; // true = good change, false = bad change, null = equal or neutral
}

export interface ParetoParadaItem {
  motivoId: string;
  codigo: string;
  descricao: string;
  tipo: string;
  tempoMinutos: number;
  tempoHoras: number;
  ocorrencias: number;
  percentualSobreTotal: number;
  percentualAcumulado: number;
}

export interface SetorConsolidadoItem {
  setor: Setor;
  metrics: ConsolidatedMetrics;
}

export interface MaquinaConsolidadaItem {
  maquina: Maquina;
  setor?: Setor;
  metrics: ConsolidatedMetrics;
}

export interface OperadorConsolidadoItem {
  operador: Operador;
  setor?: Setor;
  metrics: ConsolidatedMetrics;
  diasTrabalhados: number;
  lancamentos: LancamentoProducao[];
}

export interface TimelineDataPoint {
  dateKey: string; // YYYY-MM-DD or formatted
  label: string;
  totalBrutoKg: number;
  totalLiquidoKg: number;
  totalDescarteKg: number;
  totalRefugoKg: number;
  totalPerdaKg: number;
  percentualPerda: number;
  percentualRefugo: number;
  percentualDescarteTotal: number;
  tempoTrabalhadoMinutos: number;
  tempoParadoMinutos: number;
  produtividadeKgHora: number;
  lancamentosCount: number;
  bySetor: Record<string, number>; // setorId -> liquidoKg
}

// Utilitários de data
function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  return `${year}-${month}-${day}`;
}

export function formatYMDToBR(ymd: string): string {
  if (!ymd || ymd.length < 10) return ymd || '—';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatMinutesToHoursAndMinutes(totalMinutes: number): string {
  if (!totalMinutes || isNaN(totalMinutes) || totalMinutes <= 0) {
    return '0h 00m';
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return `${hours}h ${padZero(mins)}m`;
}

/**
 * Resolve o intervalo de datas do período atual e seu período anterior correspondente
 */
export function resolvePeriodRange(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
  baseDate?: Date
): PeriodRange {
  const now = baseDate || new Date();
  // Garante que opera com a data local limpa (meio-dia para evitar shifts de timezone)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

  let startDate = new Date(today);
  let endDate = new Date(today);
  let prevStartDate = new Date(today);
  let prevEndDate = new Date(today);
  let label = '';
  let prevLabel = '';

  switch (preset) {
    case 'hoje': {
      startDate = new Date(today);
      endDate = new Date(today);
      prevStartDate = new Date(today);
      prevStartDate.setDate(today.getDate() - 1);
      prevEndDate = new Date(prevStartDate);
      label = `Hoje (${formatYMDToBR(formatDateToYMD(startDate))})`;
      prevLabel = `Ontem (${formatYMDToBR(formatDateToYMD(prevStartDate))})`;
      break;
    }

    case 'ontem': {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 1);
      endDate = new Date(startDate);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 1);
      prevEndDate = new Date(prevStartDate);
      label = `Ontem (${formatYMDToBR(formatDateToYMD(startDate))})`;
      prevLabel = `Anteontem (${formatYMDToBR(formatDateToYMD(prevStartDate))})`;
      break;
    }

    case 'esta_semana': {
      // Semana de Segunda a Domingo
      const currentDay = today.getDay(); // 0 = Domingo, 1 = Segunda, ...
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(endDate.getDate() - 7);

      label = `Esta Semana (${formatYMDToBR(formatDateToYMD(startDate))} a ${formatYMDToBR(formatDateToYMD(endDate))})`;
      prevLabel = `Semana Anterior (${formatYMDToBR(formatDateToYMD(prevStartDate))} a ${formatYMDToBR(formatDateToYMD(prevEndDate))})`;
      break;
    }

    case 'semana_passada': {
      const currentDay = today.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() + diffToMonday);

      startDate = new Date(thisMonday);
      startDate.setDate(thisMonday.getDate() - 7);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(endDate.getDate() - 7);

      label = `Semana Passada (${formatYMDToBR(formatDateToYMD(startDate))} a ${formatYMDToBR(formatDateToYMD(endDate))})`;
      prevLabel = `Semana Retrasada (${formatYMDToBR(formatDateToYMD(prevStartDate))} a ${formatYMDToBR(formatDateToYMD(prevEndDate))})`;
      break;
    }

    case 'este_mes': {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12, 0, 0);

      prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0);
      prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0);

      const mesNome = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const prevMesNome = prevStartDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      label = `Este Mês (${mesNome})`;
      prevLabel = `Mês Anterior (${prevMesNome})`;
      break;
    }

    case 'mes_passado': {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0);

      prevStartDate = new Date(today.getFullYear(), today.getMonth() - 2, 1, 12, 0, 0);
      prevEndDate = new Date(today.getFullYear(), today.getMonth() - 1, 0, 12, 0, 0);

      const mesNome = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const prevMesNome = prevStartDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      label = `Mês Passado (${mesNome})`;
      prevLabel = `Mês Retrasado (${prevMesNome})`;
      break;
    }

    case 'este_ano': {
      startDate = new Date(today.getFullYear(), 0, 1, 12, 0, 0);
      endDate = new Date(today.getFullYear(), 11, 31, 12, 0, 0);

      prevStartDate = new Date(today.getFullYear() - 1, 0, 1, 12, 0, 0);
      prevEndDate = new Date(today.getFullYear() - 1, 11, 31, 12, 0, 0);

      label = `Ano de ${today.getFullYear()}`;
      prevLabel = `Ano de ${today.getFullYear() - 1}`;
      break;
    }

    case 'personalizado':
    default: {
      if (customStart && customEnd) {
        const partsS = customStart.split('-').map(Number);
        const partsE = customEnd.split('-').map(Number);
        startDate = new Date(partsS[0], partsS[1] - 1, partsS[2], 12, 0, 0);
        endDate = new Date(partsE[0], partsE[1] - 1, partsE[2], 12, 0, 0);
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
        endDate = new Date(today);
      }

      // Intervalo de dias
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      prevEndDate = new Date(startDate);
      prevEndDate.setDate(startDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevEndDate.getDate() - (diffDays - 1));

      label = `Personalizado (${formatYMDToBR(formatDateToYMD(startDate))} a ${formatYMDToBR(formatDateToYMD(endDate))})`;
      prevLabel = `Período Anterior equivalente (${formatYMDToBR(formatDateToYMD(prevStartDate))} a ${formatYMDToBR(formatDateToYMD(prevEndDate))})`;
      break;
    }
  }

  return {
    startDate: formatDateToYMD(startDate),
    endDate: formatDateToYMD(endDate),
    label,
    prevStartDate: formatDateToYMD(prevStartDate),
    prevEndDate: formatDateToYMD(prevEndDate),
    prevLabel,
  };
}

/**
 * Filtra lançamentos por período e critérios adicionais
 */
export function filterLancamentos(
  lancamentos: LancamentoProducao[],
  filters: {
    startDate: string;
    endDate: string;
    setorId?: string;
    maquinaId?: string;
    operadorId?: string;
    produtoId?: string;
    turnoId?: string;
  }
): LancamentoProducao[] {
  return lancamentos.filter((l) => {
    if (l.isDeleted) return false;
    if (filters.startDate && l.data < filters.startDate) return false;
    if (filters.endDate && l.data > filters.endDate) return false;
    if (filters.setorId && filters.setorId !== 'todos' && l.setorId !== filters.setorId) return false;
    if (filters.maquinaId && filters.maquinaId !== 'todas' && l.maquinaId !== filters.maquinaId) return false;
    if (filters.operadorId && filters.operadorId !== 'todos' && l.operadorId !== filters.operadorId) return false;
    if (filters.produtoId && filters.produtoId !== 'todos' && l.produtoId !== filters.produtoId) return false;
    if (filters.turnoId && filters.turnoId !== 'todos' && l.turnoId !== filters.turnoId) return false;
    return true;
  });
}

/**
 * REGRA CRÍTICA DE CÁLCULO:
 * NUNCA calcular os indicadores consolidados fazendo média simples dos percentuais dos lançamentos.
 * Os percentuais consolidados DEVEM SEMPRE ser calculados a partir dos totais absolutos somados.
 */
export function consolidateLancamentos(lancamentos: LancamentoProducao[]): ConsolidatedMetrics {
  let totalBrutoKg = 0;
  let totalLiquidoKg = 0;
  let totalRefugoKg = 0;
  let totalPerdaKg = 0;
  let tempoTrabalhadoMinutos = 0;
  let tempoParadoMinutos = 0;
  let quantidadeUnidades = 0;
  let tempoTrabalhadoCorteSoldaMin = 0;

  for (const l of lancamentos) {
    const bruto = Number(l.quantidadeBrutaKg) || 0;
    const liquido = Number(l.quantidadeLiquidaKg) || 0;
    const refugo = Number(l.refugoKg) || 0;
    const perda = Number(l.perdaKg) || 0;

    totalBrutoKg += bruto;
    totalLiquidoKg += liquido;
    totalRefugoKg += refugo;
    totalPerdaKg += perda;

    const tTrab = Number(l.tempoTrabalhadoMinutos) || 0;
    const tPar = Number(l.tempoParadoMinutos) || 0;
    tempoTrabalhadoMinutos += tTrab;
    tempoParadoMinutos += tPar;

    const unid = Number(l.quantidadeUnidades) || 0;
    quantidadeUnidades += unid;

    // Setor de corte e solda (unidades produzidas)
    if (l.setorId === 'set-cs' || unid > 0) {
      tempoTrabalhadoCorteSoldaMin += tTrab;
    }
  }

  const totalDescarteKg = totalRefugoKg + totalPerdaKg;

  // Percentuais absolutos ponderados
  const percentualPerda = totalBrutoKg > 0 ? (totalPerdaKg / totalBrutoKg) * 100 : 0;
  const percentualRefugo = totalBrutoKg > 0 ? (totalRefugoKg / totalBrutoKg) * 100 : 0;
  const percentualDescarteTotal = totalBrutoKg > 0 ? (totalDescarteKg / totalBrutoKg) * 100 : 0;
  const percentualAproveitamento = totalBrutoKg > 0 ? (totalLiquidoKg / totalBrutoKg) * 100 : 0;

  const horasProdutivas = tempoTrabalhadoMinutos / 60;
  const produtividadeKgHora = horasProdutivas > 0 ? totalLiquidoKg / horasProdutivas : 0;

  const horasProdutivasCorteSolda = tempoTrabalhadoCorteSoldaMin / 60;
  const produtividadeUnidadesHora =
    horasProdutivasCorteSolda > 0 ? quantidadeUnidades / horasProdutivasCorteSolda : 0;

  return {
    totalBrutoKg: Number(totalBrutoKg.toFixed(2)),
    totalLiquidoKg: Number(totalLiquidoKg.toFixed(2)),
    totalRefugoKg: Number(totalRefugoKg.toFixed(2)),
    totalPerdaKg: Number(totalPerdaKg.toFixed(2)),
    totalDescarteKg: Number(totalDescarteKg.toFixed(2)),
    percentualPerda: Number(percentualPerda.toFixed(2)),
    percentualRefugo: Number(percentualRefugo.toFixed(2)),
    percentualDescarteTotal: Number(percentualDescarteTotal.toFixed(2)),
    percentualAproveitamento: Number(percentualAproveitamento.toFixed(2)),
    tempoTrabalhadoMinutos: Math.round(tempoTrabalhadoMinutos),
    tempoParadoMinutos: Math.round(tempoParadoMinutos),
    horasProdutivas: Number(horasProdutivas.toFixed(2)),
    produtividadeKgHora: Number(produtividadeKgHora.toFixed(2)),
    quantidadeUnidades: Math.round(quantidadeUnidades),
    horasProdutivasCorteSolda: Number(horasProdutivasCorteSolda.toFixed(2)),
    produtividadeUnidadesHora: Number(produtividadeUnidadesHora.toFixed(1)),
    totalLancamentos: lancamentos.length,
  };
}

/**
 * Compara duas métricas e calcula variação percentual e direção qualitativa
 * @param lowerIsBetter Se true, diminuir o valor é bom (ex: perdas, paradas)
 */
export function compareMetric(
  current: number,
  previous: number,
  lowerIsBetter = false
): MetricComparison {
  const diff = current - previous;

  let percentChange: number | null = null;
  if (previous > 0) {
    percentChange = Number((((current - previous) / previous) * 100).toFixed(1));
  } else if (previous === 0 && current > 0) {
    percentChange = 100;
  }

  let trend: 'up' | 'down' | 'equal' = 'equal';
  if (Math.abs(diff) > 0.001) {
    trend = diff > 0 ? 'up' : 'down';
  }

  let isFavorable: boolean | null = null;
  if (trend !== 'equal') {
    if (lowerIsBetter) {
      isFavorable = trend === 'down';
    } else {
      isFavorable = trend === 'up';
    }
  }

  return {
    current,
    previous,
    diff: Number(diff.toFixed(2)),
    percentChange,
    trend,
    isFavorable,
  };
}

/**
 * Gera dados de Pareto para motivos de parada de máquina
 */
export function calculateParetoParadas(
  lancamentosParada: LancamentoParada[],
  motivos: MotivoParada[],
  lancamentosProducaoNoPeriodo: LancamentoProducao[],
  periodStartDate?: string,
  periodEndDate?: string
): ParetoParadaItem[] {
  // IDs dos lançamentos filtrados para cruzamento
  const validLancIds = new Set(lancamentosProducaoNoPeriodo.map((l) => l.id));

  // Filtra paradas vinculadas aos lançamentos ou que ocorreram no período
  const paradasFiltradas = lancamentosParada.filter((p) => {
    if (p.lancamentoProducaoId && validLancIds.has(p.lancamentoProducaoId)) {
      return true;
    }
    if (periodStartDate && periodEndDate && p.data >= periodStartDate && p.data <= periodEndDate) {
      return true;
    }
    return false;
  });

  const mapaMotivos = new Map<string, MotivoParada>();
  motivos.forEach((m) => mapaMotivos.set(m.id, m));

  const agrupado = new Map<string, { minutos: number; ocorrencias: number }>();

  for (const p of paradasFiltradas) {
    const motId = p.motivoParadaId || 'outro';
    const atual = agrupado.get(motId) || { minutos: 0, ocorrencias: 0 };
    atual.minutos += Number(p.tempoMinutos) || 0;
    atual.ocorrencias += 1;
    agrupado.set(motId, atual);
  }

  // Também inclui paradas apontadas diretamente no lançamento de produção caso não existam no array de paradas
  for (const l of lancamentosProducaoNoPeriodo) {
    if (l.tempoParadoMinutos > 0 && l.motivoParadaId) {
      const jaExiste = paradasFiltradas.some((p) => p.lancamentoProducaoId === l.id);
      if (!jaExiste) {
        const atual = agrupado.get(l.motivoParadaId) || { minutos: 0, ocorrencias: 0 };
        atual.minutos += Number(l.tempoParadoMinutos) || 0;
        atual.ocorrencias += 1;
        agrupado.set(l.motivoParadaId, atual);
      }
    }
  }

  const tempoTotalGeral = Array.from(agrupado.values()).reduce((acc, val) => acc + val.minutos, 0);

  // Ordena decrescente pelo tempo parado
  const sorted = Array.from(agrupado.entries())
    .map(([motId, val]) => {
      const motivo = mapaMotivos.get(motId);
      const percentual = tempoTotalGeral > 0 ? (val.minutos / tempoTotalGeral) * 100 : 0;
      return {
        motivoId: motId,
        codigo: motivo?.codigo || 'PAR-OUTRO',
        descricao: motivo?.descricao || 'Outros Motivos Operacionais',
        tipo: motivo?.tipo || 'operacional',
        tempoMinutos: val.minutos,
        tempoHoras: Number((val.minutos / 60).toFixed(1)),
        ocorrencias: val.ocorrencias,
        percentualSobreTotal: Number(percentual.toFixed(1)),
        percentualAcumulado: 0,
      };
    })
    .sort((a, b) => b.tempoMinutos - a.tempoMinutos);

  // Calcula curva de Pareto acumulada
  let acumulado = 0;
  for (const item of sorted) {
    acumulado += item.percentualSobreTotal;
    item.percentualAcumulado = Number(Math.min(100, acumulado).toFixed(1));
  }

  return sorted;
}

/**
 * Agrupa lançamentos por setor com métricas consolidadas
 */
export function groupLancamentosBySetor(
  lancamentos: LancamentoProducao[],
  setores: Setor[]
): SetorConsolidadoItem[] {
  return setores
    .map((setor) => {
      const setorLancs = lancamentos.filter((l) => l.setorId === setor.id);
      return {
        setor,
        metrics: consolidateLancamentos(setorLancs),
      };
    })
    .sort((a, b) => a.setor.ordem - b.setor.ordem);
}

/**
 * Agrupa lançamentos por máquina com métricas consolidadas
 */
export function groupLancamentosByMaquina(
  lancamentos: LancamentoProducao[],
  maquinas: Maquina[],
  setores: Setor[]
): MaquinaConsolidadaItem[] {
  const mapaSetor = new Map(setores.map((s) => [s.id, s]));

  return maquinas
    .map((maquina) => {
      const maqLancs = lancamentos.filter((l) => l.maquinaId === maquina.id);
      return {
        maquina,
        setor: mapaSetor.get(maquina.setorId),
        metrics: consolidateLancamentos(maqLancs),
      };
    })
    .sort((a, b) => b.metrics.totalLiquidoKg - a.metrics.totalLiquidoKg);
}

/**
 * Agrupa lançamentos por operador com métricas consolidadas
 */
export function groupLancamentosByOperador(
  lancamentos: LancamentoProducao[],
  operadores: Operador[],
  setores: Setor[]
): OperadorConsolidadoItem[] {
  const mapaSetor = new Map(setores.map((s) => [s.id, s]));

  return operadores
    .map((operador) => {
      const opLancs = lancamentos.filter((l) => l.operadorId === operador.id);
      const diasDistintos = new Set(opLancs.map((l) => l.data)).size;
      return {
        operador,
        setor: mapaSetor.get(operador.setorId),
        metrics: consolidateLancamentos(opLancs),
        diasTrabalhados: diasDistintos,
        lancamentos: opLancs,
      };
    })
    .filter((item) => item.metrics.totalLancamentos > 0);
}

/**
 * Agrupa dados cronologicamente para gráficos de evolução
 */
export function groupLancamentosTimeline(
  lancamentos: LancamentoProducao[],
  startDate: string,
  endDate: string
): TimelineDataPoint[] {
  // Cria mapa de datas
  const mapa = new Map<string, LancamentoProducao[]>();

  for (const l of lancamentos) {
    const list = mapa.get(l.data) || [];
    list.push(l);
    mapa.set(l.data, list);
  }

  // Obter lista ordenada de todas as datas com lançamentos
  const allDates = Array.from(mapa.keys()).sort();

  return allDates.map((dateKey) => {
    const dateLancs = mapa.get(dateKey) || [];
    const metrics = consolidateLancamentos(dateLancs);

    const bySetor: Record<string, number> = {};
    dateLancs.forEach((l) => {
      bySetor[l.setorId] = (bySetor[l.setorId] || 0) + l.quantidadeLiquidaKg;
    });

    return {
      dateKey,
      label: formatYMDToBR(dateKey),
      totalBrutoKg: metrics.totalBrutoKg,
      totalLiquidoKg: metrics.totalLiquidoKg,
      totalDescarteKg: metrics.totalDescarteKg,
      totalRefugoKg: metrics.totalRefugoKg,
      totalPerdaKg: metrics.totalPerdaKg,
      percentualPerda: metrics.percentualPerda,
      percentualRefugo: metrics.percentualRefugo,
      percentualDescarteTotal: metrics.percentualDescarteTotal,
      tempoTrabalhadoMinutos: metrics.tempoTrabalhadoMinutos,
      tempoParadoMinutos: metrics.tempoParadoMinutos,
      produtividadeKgHora: metrics.produtividadeKgHora,
      lancamentosCount: dateLancs.length,
      bySetor,
    };
  });
}

/**
 * TESTE DE VALIDAÇÃO MATEMÁTICA FORMAL (Requisitos 4 e 24):
 * Valida que a consolidação central cumpre rigorosamente a regra do percentual ponderado.
 *
 * Caso de teste da especificação:
 * Lançamento A: Bruto = 100 kg, Perda = 1 kg (1.00%)
 * Lançamento B: Bruto = 1000 kg, Perda = 40 kg (4.00%)
 *
 * Média simples incorreta: (1.00% + 4.00%) / 2 = 2.50%
 * Consolidação ponderada correta: (1 + 40) / (100 + 1000) = 41 / 1100 = 3.7272... ≈ 3.73%
 */
export function verifyWeightedVsSimpleAverage(): {
  isValid: boolean;
  simpleAveragePercent: number;
  weightedPercent: number;
  expectedWeightedPercent: number;
  explanation: string;
} {
  const dummyLancs: LancamentoProducao[] = [
    {
      id: 'test-a',
      data: '2026-09-01',
      turnoId: 't1',
      setorId: 's1',
      maquinaId: 'm1',
      operadorId: 'o1',
      produtoId: 'p1',
      quantidadeBrutaKg: 100,
      quantidadeLiquidaKg: 99,
      refugoKg: 0,
      perdaKg: 1,
      percentualPerda: 1.0,
      tempoTrabalhadoMinutos: 60,
      tempoParadoMinutos: 0,
      produtividadeKgHora: 99,
      status: 'concluido',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'test-b',
      data: '2026-09-01',
      turnoId: 't1',
      setorId: 's1',
      maquinaId: 'm1',
      operadorId: 'o1',
      produtoId: 'p1',
      quantidadeBrutaKg: 1000,
      quantidadeLiquidaKg: 960,
      refugoKg: 0,
      perdaKg: 40,
      percentualPerda: 4.0,
      tempoTrabalhadoMinutos: 60,
      tempoParadoMinutos: 0,
      produtividadeKgHora: 960,
      status: 'concluido',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  const simpleAverage = (1.0 + 4.0) / 2; // 2.5%
  const consolidated = consolidateLancamentos(dummyLancs);
  const weighted = consolidated.percentualPerda; // 3.73%

  return {
    isValid: weighted === 3.73,
    simpleAveragePercent: simpleAverage,
    weightedPercent: weighted,
    expectedWeightedPercent: 3.73,
    explanation: `Soma das perdas (41 kg) dividida pela soma dos brutos (1.100 kg) resulta em ${weighted}%, superando a falácia da média simples de ${simpleAverage}%.`,
  };
}

// =======================================================================
// INTERFACES & FUNÇÕES AVANÇADAS PARA A CENTRAL DE RELATÓRIOS
// =======================================================================

export interface ProdutoConsolidadoItem {
  produto: Produto;
  metrics: ConsolidatedMetrics;
  maquinasCodigos: string[];
  lancamentosCount: number;
  diasFabricados: number;
  lancamentos: LancamentoProducao[];
}

export interface TurnoConsolidadoItem {
  turno: Turno;
  metrics: ConsolidatedMetrics;
  lancamentosCount: number;
  lancamentos: LancamentoProducao[];
}

export interface DiarioConsolidadoItem {
  data: string; // YYYY-MM-DD
  dataFormatada: string; // DD/MM/YYYY
  diaSemana: string; // Segunda-feira, etc.
  extrusoraKg: number;
  impressaoKg: number;
  corteSoldaKg: number;
  metrics: ConsolidatedMetrics;
  lancamentos: LancamentoProducao[];
}

export interface SemanalConsolidadoItem {
  semanaKey: string; // 2026-W35
  semanaNum: number;
  ano: number;
  semanaRotulo: string;
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string; // YYYY-MM-DD
  metrics: ConsolidatedMetrics;
  lancamentos: LancamentoProducao[];
}

export interface MensalConsolidadoItem {
  mesAnoKey: string; // YYYY-MM
  mesNum: number;
  ano: number;
  mesNome: string;
  extrusoraKg: number;
  impressaoKg: number;
  corteSoldaKg: number;
  metrics: ConsolidatedMetrics;
  lancamentos: LancamentoProducao[];
}

export interface ComparacaoMetricaItem {
  indicador: string;
  unidade: string;
  valorA: number;
  valorB: number;
  diferenca: number;
  variacaoPercent: number | null;
  status: 'MELHOROU' | 'PIOROU' | 'ESTÁVEL';
  isFavorable: boolean | null;
  lowerIsBetter: boolean;
}

export interface ParadaPorMaquinaItem {
  maquina: Maquina;
  setorNome: string;
  quantidadeParadas: number;
  tempoTotalMinutos: number;
  tempoMedioMinutos: number;
  percentualTempoParadoGeral: number;
  paradas: LancamentoParada[];
}

export interface DetalheParadaOcorrencia {
  data: string;
  maquinaCodigo: string;
  setorNome: string;
  operadorNome: string;
  produtoDescricao: string;
  tempoMinutos: number;
  observacoes: string;
}

export interface ParadaPorMotivoItem {
  motivoId: string;
  codigo: string;
  descricao: string;
  tipo: string;
  quantidadeOcorrencias: number;
  tempoTotalMinutos: number;
  tempoMedioMinutos: number;
  percentualTempoParadoGeral: number;
  percentualAcumulado: number;
  detalhes: DetalheParadaOcorrencia[];
}

/**
 * Formatadores seguros que nunca produzem NaN, undefined ou Infinity
 */
export function formatPtBrNumber(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return '—';
  }
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPtBrKg(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return '—';
  }
  return `${formatPtBrNumber(val, 2)} kg`;
}

export function formatPtBrUn(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return '—';
  }
  return `${Math.round(val).toLocaleString('pt-BR')} un`;
}

export function formatPtBrPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return '—';
  }
  return `${formatPtBrNumber(val, 2)}%`;
}

export function formatPtBrHoursMin(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || isNaN(minutos) || !isFinite(minutos) || minutos <= 0) {
    return '0h 00min';
  }
  const hours = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return `${hours}h ${padZero(mins)}min`;
}

/**
 * Agrupa lançamentos por produto com indicadores consolidados
 */
export function groupLancamentosByProduto(
  lancamentos: LancamentoProducao[],
  produtos: Produto[],
  maquinas: Maquina[]
): ProdutoConsolidadoItem[] {
  const mapaMaquinas = new Map(maquinas.map((m) => [m.id, m.codigo]));
  const mapaProdutos = new Map(produtos.map((p) => [p.id, p]));

  // Agrupa lançamentos por produtoId
  const agrupado = new Map<string, LancamentoProducao[]>();
  for (const l of lancamentos) {
    const list = agrupado.get(l.produtoId) || [];
    list.push(l);
    agrupado.set(l.produtoId, list);
  }

  const result: ProdutoConsolidadoItem[] = [];

  for (const [prodId, prodLancs] of agrupado.entries()) {
    const produto: Produto = mapaProdutos.get(prodId) || {
      id: prodId,
      codigo: 'PROD-N/D',
      descricao: `Produto ${prodId}`,
      setorOrigemId: prodLancs[0]?.setorId || 'set-ext',
      tipoMaterial: 'PEBD',
      espessuraMicras: 0,
      larguraMm: 0,
      ativo: true,
      createdAt: '',
      updatedAt: '',
    };

    const metrics = consolidateLancamentos(prodLancs);

    const maquinasSet = new Set<string>();
    const diasSet = new Set<string>();
    prodLancs.forEach((l) => {
      const cod = mapaMaquinas.get(l.maquinaId) || l.maquinaId;
      maquinasSet.add(cod);
      diasSet.add(l.data);
    });

    result.push({
      produto,
      metrics,
      maquinasCodigos: Array.from(maquinasSet),
      lancamentosCount: prodLancs.length,
      diasFabricados: diasSet.size,
      lancamentos: prodLancs,
    });
  }

  // Ordena por produção líquida decrescente
  return result.sort((a, b) => b.metrics.totalLiquidoKg - a.metrics.totalLiquidoKg);
}

/**
 * Agrupa lançamentos por turno
 */
export function groupLancamentosByTurno(
  lancamentos: LancamentoProducao[],
  turnos: Turno[]
): TurnoConsolidadoItem[] {
  const mapaTurnos = new Map(turnos.map((t) => [t.id, t]));

  const agrupado = new Map<string, LancamentoProducao[]>();
  for (const l of lancamentos) {
    const list = agrupado.get(l.turnoId) || [];
    list.push(l);
    agrupado.set(l.turnoId, list);
  }

  return turnos.map((turno) => {
    const turnoLancs = agrupado.get(turno.id) || [];
    return {
      turno,
      metrics: consolidateLancamentos(turnoLancs),
      lancamentosCount: turnoLancs.length,
      lancamentos: turnoLancs,
    };
  });
}

/**
 * Agrupa lançamentos por dia (Relatório Diário)
 */
export function groupLancamentosDiario(
  lancamentos: LancamentoProducao[]
): DiarioConsolidadoItem[] {
  const mapa = new Map<string, LancamentoProducao[]>();

  for (const l of lancamentos) {
    const list = mapa.get(l.data) || [];
    list.push(l);
    mapa.set(l.data, list);
  }

  const datas = Array.from(mapa.keys()).sort((a, b) => b.localeCompare(a)); // Mais recente primeiro por padrão

  const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  return datas.map((dataKey) => {
    const diaLancs = mapa.get(dataKey) || [];
    const metrics = consolidateLancamentos(diaLancs);

    let extrusoraKg = 0;
    let impressaoKg = 0;
    let corteSoldaKg = 0;

    for (const l of diaLancs) {
      if (l.setorId === 'set-ext') extrusoraKg += l.quantidadeLiquidaKg;
      else if (l.setorId === 'set-imp') impressaoKg += l.quantidadeLiquidaKg;
      else if (l.setorId === 'set-cs') corteSoldaKg += l.quantidadeLiquidaKg;
    }

    const parts = dataKey.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const diaSemana = DIAS_SEMANA[dateObj.getDay()] || '';

    return {
      data: dataKey,
      dataFormatada: formatYMDToBR(dataKey),
      diaSemana,
      extrusoraKg: Number(extrusoraKg.toFixed(2)),
      impressaoKg: Number(impressaoKg.toFixed(2)),
      corteSoldaKg: Number(corteSoldaKg.toFixed(2)),
      metrics,
      lancamentos: diaLancs,
    };
  });
}

/**
 * Calcula número da semana ISO para agrupamento semanal
 */
function getWeekDetails(date: Date): { weekNum: number; year: number; monday: Date; sunday: Date } {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // 0 = Segunda, 6 = Domingo
  target.setDate(target.getDate() - dayNr + 3); // Quinta-feira da mesma semana
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getFullYear();

  // Segunda-feira
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayNr);
  // Domingo
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { weekNum, year, monday, sunday };
}

/**
 * Agrupa lançamentos por semana (Relatório Semanal)
 */
export function groupLancamentosSemanal(
  lancamentos: LancamentoProducao[]
): SemanalConsolidadoItem[] {
  const mapa = new Map<string, {
    semanaNum: number;
    ano: number;
    dataInicial: string;
    dataFinal: string;
    lancamentos: LancamentoProducao[];
  }>();

  for (const l of lancamentos) {
    const parts = l.data.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const { weekNum, year, monday, sunday } = getWeekDetails(dateObj);
    const key = `${year}-W${padZero(weekNum)}`;

    const current = mapa.get(key) || {
      semanaNum: weekNum,
      ano: year,
      dataInicial: formatDateToYMD(monday),
      dataFinal: formatDateToYMD(sunday),
      lancamentos: [],
    };
    current.lancamentos.push(l);
    mapa.set(key, current);
  }

  const chaves = Array.from(mapa.keys()).sort().reverse();

  return chaves.map((key) => {
    const item = mapa.get(key)!;
    const metrics = consolidateLancamentos(item.lancamentos);
    const rotulo = `Semana ${padZero(item.semanaNum)}/${item.ano} (${formatYMDToBR(item.dataInicial)} a ${formatYMDToBR(item.dataFinal)})`;

    return {
      semanaKey: key,
      semanaNum: item.semanaNum,
      ano: item.ano,
      semanaRotulo: rotulo,
      dataInicial: item.dataInicial,
      dataFinal: item.dataFinal,
      metrics,
      lancamentos: item.lancamentos,
    };
  });
}

/**
 * Agrupa lançamentos por mês de um ano específico (Relatório Mensal)
 * Recalcula rigorosamente o TOTAL DO ANO a partir dos valores absolutos anuais.
 */
export function groupLancamentosMensal(
  lancamentos: LancamentoProducao[],
  ano: number
): {
  meses: MensalConsolidadoItem[];
  totalAno: ConsolidatedMetrics;
} {
  const MESES_NOMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // Filtra lançamentos estritamente daquele ano
  const anoLancs = lancamentos.filter((l) => {
    const [y] = l.data.split('-').map(Number);
    return y === ano;
  });

  const mesesMap = new Map<number, LancamentoProducao[]>();
  for (let m = 1; m <= 12; m++) {
    mesesMap.set(m, []);
  }

  for (const l of anoLancs) {
    const [, month] = l.data.split('-').map(Number);
    if (month >= 1 && month <= 12) {
      mesesMap.get(month)!.push(l);
    }
  }

  const meses: MensalConsolidadoItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const mesLancs = mesesMap.get(m) || [];
    const metrics = consolidateLancamentos(mesLancs);

    let extrusoraKg = 0;
    let impressaoKg = 0;
    let corteSoldaKg = 0;

    for (const l of mesLancs) {
      if (l.setorId === 'set-ext') extrusoraKg += l.quantidadeLiquidaKg;
      else if (l.setorId === 'set-imp') impressaoKg += l.quantidadeLiquidaKg;
      else if (l.setorId === 'set-cs') corteSoldaKg += l.quantidadeLiquidaKg;
    }

    meses.push({
      mesAnoKey: `${ano}-${padZero(m)}`,
      mesNum: m,
      ano,
      mesNome: MESES_NOMES[m - 1],
      extrusoraKg: Number(extrusoraKg.toFixed(2)),
      impressaoKg: Number(impressaoKg.toFixed(2)),
      corteSoldaKg: Number(corteSoldaKg.toFixed(2)),
      metrics,
      lancamentos: mesLancs,
    });
  }

  // TOTAL DO ANO: Calculado rigorosamente somando os valores absolutos do ano (NUNCA média simples)
  const totalAno = consolidateLancamentos(anoLancs);

  return { meses, totalAno };
}

/**
 * Compara dois meses selecionados (Mês A vs Mês B)
 * Interpreta corretamente cada indicador:
 * Menor perda = MELHOROU
 * Menor refugo = MELHOROU
 * Menor tempo parado = MELHOROU
 * Maior produção = MELHOROU
 * Maior produtividade = MELHOROU
 * Maior aproveitamento = MELHOROU
 */
export function compareMesesA_vs_B(
  lancamentosMesA: LancamentoProducao[],
  lancamentosMesB: LancamentoProducao[],
  rotuloA: string,
  rotuloB: string
): ComparacaoMetricaItem[] {
  const mA = consolidateLancamentos(lancamentosMesA);
  const mB = consolidateLancamentos(lancamentosMesB);

  function buildItem(
    indicador: string,
    unidade: string,
    valA: number,
    valB: number,
    lowerIsBetter: boolean
  ): ComparacaoMetricaItem {
    const diff = valA - valB;
    let variacaoPercent: number | null = null;
    if (valB > 0) {
      variacaoPercent = Number((((valA - valB) / valB) * 100).toFixed(1));
    } else if (valB === 0 && valA > 0) {
      variacaoPercent = 100;
    }

    let status: 'MELHOROU' | 'PIOROU' | 'ESTÁVEL' = 'ESTÁVEL';
    let isFavorable: boolean | null = null;

    if (Math.abs(diff) > 0.01) {
      if (lowerIsBetter) {
        // Reduzir valor é melhor (perdas, refugo, paradas)
        if (diff < 0) {
          status = 'MELHOROU';
          isFavorable = true;
        } else {
          status = 'PIOROU';
          isFavorable = false;
        }
      } else {
        // Aumentar valor é melhor (produção, aproveitamento, produtividade)
        if (diff > 0) {
          status = 'MELHOROU';
          isFavorable = true;
        } else {
          status = 'PIOROU';
          isFavorable = false;
        }
      }
    }

    return {
      indicador,
      unidade,
      valorA: Number(valA.toFixed(2)),
      valorB: Number(valB.toFixed(2)),
      diferenca: Number(diff.toFixed(2)),
      variacaoPercent,
      status,
      isFavorable,
      lowerIsBetter,
    };
  }

  return [
    buildItem('Produção Líquida Boa', 'kg', mA.totalLiquidoKg, mB.totalLiquidoKg, false),
    buildItem('Perda de Processo / Setup', 'kg', mA.totalPerdaKg, mB.totalPerdaKg, true),
    buildItem('Taxa de Perda', '%', mA.percentualPerda, mB.percentualPerda, true),
    buildItem('Refugo / Sucata', 'kg', mA.totalRefugoKg, mB.totalRefugoKg, true),
    buildItem('Taxa de Refugo', '%', mA.percentualRefugo, mB.percentualRefugo, true),
    buildItem('Aproveitamento de Material', '%', mA.percentualAproveitamento, mB.percentualAproveitamento, false),
    buildItem('Tempo Total Parado', 'min', mA.tempoParadoMinutos, mB.tempoParadoMinutos, true),
    buildItem('Produtividade Média', 'kg/h', mA.produtividadeKgHora, mB.produtividadeKgHora, false),
    buildItem('Unidades Produzidas (C&S)', 'un', mA.quantidadeUnidades, mB.quantidadeUnidades, false),
  ];
}

export interface ParadaMotivoCompleto {
  motivoId: string;
  motivoNome: string;
  quantidadeOcorrencias: number;
  tempoTotalMinutos: number;
  tempoMedioMinutos: number;
  percentualDoTotal: number;
  percentualAcumulado: number;
  lancamentos: LancamentoProducao[];
}

export interface ParadaMaquinaResumo {
  maquina: Maquina;
  setor: Setor | undefined;
  numeroParadas: number;
  tempoTotalMinutos: number;
  tempoMedioMinutos: number;
  percentualDoTempoGeral: number;
  lancamentos: LancamentoProducao[];
}

/**
 * Calcula indicadores de Paradas por Máquina diretamente a partir dos lançamentos de produção
 */
export function calculateParadasPorMaquina(
  lancamentos: LancamentoProducao[],
  maquinas: Maquina[],
  setores: Setor[]
): ParadaMaquinaResumo[] {
  const mapaSetor = new Map(setores.map((s) => [s.id, s]));
  const totalMinutosParadosGeral = lancamentos.reduce((acc, l) => acc + (l.tempoParadoMinutos || 0), 0);

  const res: ParadaMaquinaResumo[] = maquinas
    .map((maq) => {
      const maqLancs = lancamentos.filter((l) => l.maquinaId === maq.id && (l.tempoParadoMinutos || 0) > 0);
      const tempoTotal = maqLancs.reduce((acc, l) => acc + (l.tempoParadoMinutos || 0), 0);
      const qtd = maqLancs.length;
      const tempoMedio = qtd > 0 ? tempoTotal / qtd : 0;
      const percGeral = totalMinutosParadosGeral > 0 ? (tempoTotal / totalMinutosParadosGeral) * 100 : 0;

      return {
        maquina: maq,
        setor: mapaSetor.get(maq.setorId),
        numeroParadas: qtd,
        tempoTotalMinutos: tempoTotal,
        tempoMedioMinutos: Number(tempoMedio.toFixed(1)),
        percentualDoTempoGeral: Number(percGeral.toFixed(1)),
        lancamentos: maqLancs,
      };
    })
    .filter((item) => item.numeroParadas > 0 || item.tempoTotalMinutos > 0)
    .sort((a, b) => b.tempoTotalMinutos - a.tempoTotalMinutos);

  return res;
}

/**
 * Calcula detalhamento completo dos Motivos de Parada com Curva de Pareto acumulada
 */
export function calculateParadasPorMotivoCompleto(
  lancamentos: LancamentoProducao[],
  motivos: MotivoParada[]
): ParadaMotivoCompleto[] {
  const mapaMotivos = new Map(motivos.map((m) => [m.id, m]));
  const lancsComParada = lancamentos.filter((l) => (l.tempoParadoMinutos || 0) > 0);
  const tempoTotalGeral = lancsComParada.reduce((acc, l) => acc + (l.tempoParadoMinutos || 0), 0);

  const agrupado = new Map<string, LancamentoProducao[]>();

  for (const l of lancsComParada) {
    const mId = l.motivoParadaId || 'OUTRO';
    const list = agrupado.get(mId) || [];
    list.push(l);
    agrupado.set(mId, list);
  }

  const sorted = Array.from(agrupado.entries())
    .map(([motId, list]) => {
      const motivoObj = mapaMotivos.get(motId);
      const tempoTotal = list.reduce((acc, l) => acc + (l.tempoParadoMinutos || 0), 0);
      const qtd = list.length;
      const tempoMedio = qtd > 0 ? tempoTotal / qtd : 0;
      const percGeral = tempoTotalGeral > 0 ? (tempoTotal / tempoTotalGeral) * 100 : 0;

      return {
        motivoId: motId,
        motivoNome: motivoObj?.descricao || motivoObj?.codigo || 'Outros / Não Especificado',
        quantidadeOcorrencias: qtd,
        tempoTotalMinutos: tempoTotal,
        tempoMedioMinutos: Number(tempoMedio.toFixed(1)),
        percentualDoTotal: Number(percGeral.toFixed(1)),
        percentualAcumulado: 0,
        lancamentos: list,
      };
    })
    .sort((a, b) => b.tempoTotalMinutos - a.tempoTotalMinutos);

  let acumulado = 0;
  for (const item of sorted) {
    acumulado += item.percentualDoTotal;
    item.percentualAcumulado = Number(Math.min(100, acumulado).toFixed(1));
  }

  return sorted;
}
