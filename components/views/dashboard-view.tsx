'use client';

import React, { useState, useMemo } from 'react';
import { useProductionDB } from '@/lib/db-context';
import { TabKey } from '@/components/sidebar';
import {
  PeriodPreset,
  DashboardFilters,
  resolvePeriodRange,
  filterLancamentos,
  consolidateLancamentos,
  compareMetric,
  calculateParetoParadas,
  groupLancamentosBySetor,
  groupLancamentosByMaquina,
  groupLancamentosByOperador,
  groupLancamentosTimeline,
  verifyWeightedVsSimpleAverage,
  formatYMDToBR,
  formatMinutesToHoursAndMinutes,
} from '@/lib/production-analytics';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  Award,
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  PieChart,
  BarChart3,
  ListFilter,
  Hash,
  ExternalLink,
  SlidersHorizontal,
  Package,
  Sparkles,
  Info,
} from 'lucide-react';

export function DashboardView({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data, loadDemoData } = useProductionDB();

  // Estado dos filtros
  const [filters, setFilters] = useState<DashboardFilters>({
    preset: 'este_mes',
    startDate: '',
    endDate: '',
    setorId: 'todos',
    maquinaId: 'todas',
    operadorId: 'todos',
    produtoId: 'todos',
    turnoId: 'todos',
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDrilldownTable, setShowDrilldownTable] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedTimelineMetric, setSelectedTimelineMetric] = useState<'producao' | 'perda'>('producao');

  // Determina a data base de referência com base nos lançamentos mais recentes ou na data de hoje
  const baseReferenceDate = useMemo(() => {
    if (data.lancamentosProducao.length > 0) {
      // Pega a maior data registrada nos lançamentos para garantir que presets como 'hoje' ou 'este_mes' funcionem com a base do sistema
      const maxDateStr = data.lancamentosProducao.reduce((max, l) => (l.data > max ? l.data : max), '2026-09-03');
      const parts = maxDateStr.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
    return new Date(2026, 8, 3, 12, 0, 0); // 03/09/2026
  }, [data.lancamentosProducao]);

  // Resolução do período atual e anterior equivalente
  const periodRange = useMemo(() => {
    return resolvePeriodRange(
      filters.preset,
      filters.startDate,
      filters.endDate,
      baseReferenceDate
    );
  }, [filters.preset, filters.startDate, filters.endDate, baseReferenceDate]);

  // Filtra lançamentos do período atual
  const currentLancamentos = useMemo(() => {
    return filterLancamentos(data.lancamentosProducao, {
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
      setorId: filters.setorId,
      maquinaId: filters.maquinaId,
      operadorId: filters.operadorId,
      produtoId: filters.produtoId,
      turnoId: filters.turnoId,
    });
  }, [data.lancamentosProducao, periodRange, filters]);

  // Filtra lançamentos do período anterior equivalente (com os mesmos filtros de máquina/operador/etc)
  const previousLancamentos = useMemo(() => {
    return filterLancamentos(data.lancamentosProducao, {
      startDate: periodRange.prevStartDate,
      endDate: periodRange.prevEndDate,
      setorId: filters.setorId,
      maquinaId: filters.maquinaId,
      operadorId: filters.operadorId,
      produtoId: filters.produtoId,
      turnoId: filters.turnoId,
    });
  }, [data.lancamentosProducao, periodRange, filters]);

  // Consolidação matemática centralizada (REGRA CRÍTICA: totais absolutos)
  const currentMetrics = useMemo(() => consolidateLancamentos(currentLancamentos), [currentLancamentos]);
  const prevMetrics = useMemo(() => consolidateLancamentos(previousLancamentos), [previousLancamentos]);

  // Comparações de cada KPI
  const compProducao = useMemo(
    () => compareMetric(currentMetrics.totalLiquidoKg, prevMetrics.totalLiquidoKg, false),
    [currentMetrics.totalLiquidoKg, prevMetrics.totalLiquidoKg]
  );
  const compPerda = useMemo(
    () => compareMetric(currentMetrics.totalPerdaKg, prevMetrics.totalPerdaKg, true),
    [currentMetrics.totalPerdaKg, prevMetrics.totalPerdaKg]
  );
  const compPercentualPerda = useMemo(
    () => compareMetric(currentMetrics.percentualPerda, prevMetrics.percentualPerda, true),
    [currentMetrics.percentualPerda, prevMetrics.percentualPerda]
  );
  const compRefugo = useMemo(
    () => compareMetric(currentMetrics.totalRefugoKg, prevMetrics.totalRefugoKg, true),
    [currentMetrics.totalRefugoKg, prevMetrics.totalRefugoKg]
  );
  const compPercentualRefugo = useMemo(
    () => compareMetric(currentMetrics.percentualRefugo, prevMetrics.percentualRefugo, true),
    [currentMetrics.percentualRefugo, prevMetrics.percentualRefugo]
  );
  const compAproveitamento = useMemo(
    () => compareMetric(currentMetrics.percentualAproveitamento, prevMetrics.percentualAproveitamento, false),
    [currentMetrics.percentualAproveitamento, prevMetrics.percentualAproveitamento]
  );
  const compTempoParado = useMemo(
    () => compareMetric(currentMetrics.tempoParadoMinutos, prevMetrics.tempoParadoMinutos, true),
    [currentMetrics.tempoParadoMinutos, prevMetrics.tempoParadoMinutos]
  );
  const compProdutividade = useMemo(
    () => compareMetric(currentMetrics.produtividadeKgHora, prevMetrics.produtividadeKgHora, false),
    [currentMetrics.produtividadeKgHora, prevMetrics.produtividadeKgHora]
  );
  const compUnidades = useMemo(
    () => compareMetric(currentMetrics.quantidadeUnidades, prevMetrics.quantidadeUnidades, false),
    [currentMetrics.quantidadeUnidades, prevMetrics.quantidadeUnidades]
  );

  // Consolidação por setor
  const setorData = useMemo(
    () => groupLancamentosBySetor(currentLancamentos, data.setores),
    [currentLancamentos, data.setores]
  );

  // Consolidação por máquina
  const maquinaData = useMemo(() => {
    let maquinas = data.maquinas;
    if (filters.setorId !== 'todos') {
      maquinas = maquinas.filter((m) => m.setorId === filters.setorId);
    }
    return groupLancamentosByMaquina(currentLancamentos, maquinas, data.setores);
  }, [currentLancamentos, data.maquinas, data.setores, filters.setorId]);

  // Ranking de operadores
  const operadorData = useMemo(() => {
    let operadores = data.operadores;
    if (filters.setorId !== 'todos') {
      operadores = operadores.filter((o) => o.setorId === filters.setorId);
    }
    return groupLancamentosByOperador(currentLancamentos, operadores, data.setores);
  }, [currentLancamentos, data.operadores, data.setores, filters.setorId]);

  // Top Operadores por Produção (Volume)
  const topProdutores = useMemo(() => {
    return [...operadorData].sort((a, b) => b.metrics.totalLiquidoKg - a.metrics.totalLiquidoKg).slice(0, 5);
  }, [operadorData]);

  // Top Operadores por Menor Perda (%) - apenas com produção > 0
  const topMenorPerda = useMemo(() => {
    return [...operadorData]
      .filter((o) => o.metrics.totalBrutoKg > 0)
      .sort((a, b) => a.metrics.percentualPerda - b.metrics.percentualPerda)
      .slice(0, 5);
  }, [operadorData]);

  // Pareto de Motivos de Parada
  const paretoParadas = useMemo(() => {
    return calculateParetoParadas(
      data.lancamentosParada,
      data.motivosParada,
      currentLancamentos,
      periodRange.startDate,
      periodRange.endDate
    );
  }, [data.lancamentosParada, data.motivosParada, currentLancamentos, periodRange]);

  // Linha do tempo (evolução temporal)
  const timelineData = useMemo(() => {
    return groupLancamentosTimeline(currentLancamentos, periodRange.startDate, periodRange.endDate);
  }, [currentLancamentos, periodRange]);

  // Meta corporativa
  const metaGeralPerda = data.configuracoes.metaGeralPerda || 2.5;

  // Auditoria formal da regra crítica
  const auditResult = useMemo(() => verifyWeightedVsSimpleAverage(), []);

  // Verifica se há filtros ativos
  const hasActiveFilters =
    filters.preset !== 'este_mes' ||
    filters.setorId !== 'todos' ||
    filters.maquinaId !== 'todas' ||
    filters.operadorId !== 'todos' ||
    filters.produtoId !== 'todos' ||
    filters.turnoId !== 'todos';

  const handleResetFilters = () => {
    setFilters({
      preset: 'este_mes',
      startDate: '',
      endDate: '',
      setorId: 'todos',
      maquinaId: 'todas',
      operadorId: 'todos',
      produtoId: 'todos',
      turnoId: 'todos',
    });
  };

  // Preset pill click
  const handlePresetChange = (preset: PeriodPreset) => {
    setFilters((prev) => ({
      ...prev,
      preset,
      // Se mudar para um preset rápido, limpa as datas manuais para recalcular limpo
      startDate: preset === 'personalizado' ? prev.startDate || periodRange.startDate : '',
      endDate: preset === 'personalizado' ? prev.endDate || periodRange.endDate : '',
    }));
  };

  // Toggle do filtro de setor pelo clique no card do setor
  const handleSetorCardClick = (setorId: string) => {
    setFilters((prev) => ({
      ...prev,
      setorId: prev.setorId === setorId ? 'todos' : setorId,
      maquinaId: 'todas', // Reseta máquina ao trocar de setor
    }));
  };

  // Máquinas disponíveis de acordo com o setor selecionado
  const availableMaquinas = useMemo(() => {
    if (filters.setorId === 'todos') {
      return data.maquinas;
    }
    return data.maquinas.filter((m) => m.setorId === filters.setorId);
  }, [data.maquinas, filters.setorId]);

  return (
    <div className="space-y-6">
      {/* 1. BARRA PRINCIPAL DE CONTROLE E PERÍODO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span>Painel Gerencial de Produção • Etapa 3</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Consolidação Automática da Fábrica
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Indicadores consolidados em tempo real a partir dos lançamentos das planilhas de produção.
            </p>
          </div>

          {/* Ações Rápidas: Novo Lançamento + Auditoria de Regra */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
              title="Auditar integridade dos percentuais ponderados"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Regra de Cálculo Validada</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('lancamentos')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Apontamento</span>
            </button>
          </div>
        </div>

        {/* SELEÇÃO RÁPIDA DE PERÍODO (Pills) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'hoje', label: 'Hoje' },
                { key: 'ontem', label: 'Ontem' },
                { key: 'esta_semana', label: 'Esta Semana' },
                { key: 'semana_passada', label: 'Semana Passada' },
                { key: 'este_mes', label: 'Este Mês' },
                { key: 'mes_passado', label: 'Mês Passado' },
                { key: 'este_ano', label: 'Este Ano' },
                { key: 'personalizado', label: 'Personalizado' },
              ] as const
            ).map((item) => {
              const active = filters.preset === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handlePresetChange(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros Específicos</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                title="Limpar todos os filtros e voltar ao padrão"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* INPUTS DE PERÍODO PERSONALIZADO */}
        {filters.preset === 'personalizado' && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700">Definir intervalo:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">De:</label>
              <input
                type="date"
                value={periodRange.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    preset: 'personalizado',
                    startDate: e.target.value,
                  }))
                }
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">Até:</label>
              <input
                type="date"
                value={periodRange.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    preset: 'personalizado',
                    endDate: e.target.value,
                  }))
                }
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* FILTROS ADICIONAIS EXPANSÍVEIS (Setor, Máquina, Operador, Produto, Turno) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Setor */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Setor Fabril
              </label>
              <select
                value={filters.setorId}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    setorId: e.target.value,
                    maquinaId: 'todas',
                  }))
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="todos">Todos os Setores</option>
                {data.setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Máquina */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Máquina
              </label>
              <select
                value={filters.maquinaId}
                onChange={(e) => setFilters((prev) => ({ ...prev, maquinaId: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="todas">Todas as Máquinas</option>
                {availableMaquinas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Operador */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Operador
              </label>
              <select
                value={filters.operadorId}
                onChange={(e) => setFilters((prev) => ({ ...prev, operadorId: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="todos">Todos os Operadores</option>
                {data.operadores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Produto */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Produto / Item
              </label>
              <select
                value={filters.produtoId}
                onChange={(e) => setFilters((prev) => ({ ...prev, produtoId: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="todos">Todos os Produtos</option>
                {data.produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descricao}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STATUS VISUAL DO PERÍODO SELECIONADO E COMPARATIVO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Período ativo: <strong className="text-slate-900">{periodRange.label}</strong>
              {' '}({formatYMDToBR(periodRange.startDate)} até {formatYMDToBR(periodRange.endDate)})
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Base de comparação: <strong className="text-slate-700">{periodRange.prevLabel}</strong>
            {' '}({formatYMDToBR(periodRange.prevStartDate)} até {formatYMDToBR(periodRange.prevEndDate)})
          </div>
        </div>
      </div>

      {/* Banner Informativo quando não há apontamentos reais ainda */}
      {data.lancamentosProducao.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Nenhum apontamento registrado ainda no sistema</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Registre seus apontamentos reais na aba <strong>&quot;Lançamentos&quot;</strong>. Conforme você for preenchendo as ordens de produção, os gráficos de produtividade, perdas, ranking de operadores e paradas serão atualizados e consolidados automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('lancamentos')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Fazer Novo Lançamento</span>
          </button>
        </div>
      )}

      {/* 2. CARDS DE INDICADORES PRINCIPAIS COM COMPARAÇÃO ANTERIOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Produção Total Líquida Boa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Produção Boa (Líquida)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-slate-900">
                {currentMetrics.totalLiquidoKg.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-bold text-slate-500">kg</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Volume alimentado bruto:{' '}
              <strong className="font-mono text-slate-700">
                {currentMetrics.totalBrutoKg.toLocaleString('pt-BR')} kg
              </strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">vs. Anterior ({prevMetrics.totalLiquidoKg.toLocaleString('pt-BR')} kg):</span>
            <VariationBadge comparison={compProducao} unit="kg" />
          </div>
        </div>

        {/* KPI 2: Perda Total e Percentual de Perda */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Perdas de Processo / Setup
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-amber-600">
                {currentMetrics.totalPerdaKg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              </span>
              <span className="text-xs font-bold text-slate-500">kg</span>
              <span
                className={`ml-auto text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                  currentMetrics.percentualPerda <= metaGeralPerda
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {currentMetrics.percentualPerda.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Meta da fábrica: <strong className="text-indigo-600">≤ {metaGeralPerda}%</strong> (Soma Perdas / Soma Bruto)
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">vs. Anterior ({prevMetrics.totalPerdaKg} kg):</span>
            <VariationBadge comparison={compPerda} unit="kg" lowerIsBetter />
          </div>
        </div>

        {/* KPI 3: Refugo Total (Aparas / Sucata) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Refugo Total (Aparas / Borras)
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-rose-600">
                {currentMetrics.totalRefugoKg.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              </span>
              <span className="text-xs font-bold text-slate-500">kg</span>
              <span className="ml-auto text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {currentMetrics.percentualRefugo.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Descarte total acumulado:{' '}
              <strong className="font-mono text-rose-700">
                {currentMetrics.totalDescarteKg.toLocaleString('pt-BR')} kg ({currentMetrics.percentualDescarteTotal.toFixed(2)}%)
              </strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">vs. Anterior ({prevMetrics.totalRefugoKg} kg):</span>
            <VariationBadge comparison={compRefugo} unit="kg" lowerIsBetter />
          </div>
        </div>

        {/* KPI 4: Rendimento / Aproveitamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aproveitamento Líquido
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-indigo-700">
                {currentMetrics.percentualAproveitamento.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Taxa de eficiência material (Líquido / Bruto)
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">vs. Anterior ({prevMetrics.percentualAproveitamento.toFixed(2)}%):</span>
            <VariationBadge comparison={compAproveitamento} isPercent />
          </div>
        </div>
      </div>

      {/* KPI LINHA SECUNDÁRIA: TEMPO PARADO, HORAS PRODUTIVAS, PRODUTIVIDADE KG/H E UNIDADES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tempo Total Parado */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tempo Total Parado</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {formatMinutesToHoursAndMinutes(currentMetrics.tempoParadoMinutos)}
            </span>
            <span className="text-xs text-slate-500">({currentMetrics.tempoParadoMinutos} min)</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">vs. anterior:</span>
            <VariationBadge comparison={compTempoParado} unit="min" lowerIsBetter />
          </div>
        </div>

        {/* Horas Produtivas */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Horas Produtivas</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {currentMetrics.horasProdutivas.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">horas trabalhadas</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Apontamentos:</span>
            <strong className="font-mono text-slate-700">{currentMetrics.totalLancamentos} turnos</strong>
          </div>
        </div>

        {/* Produtividade Média (kg/h) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Produtividade Média</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {currentMetrics.produtividadeKgHora.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500">kg/hora</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">vs. anterior:</span>
            <VariationBadge comparison={compProdutividade} unit="kg/h" />
          </div>
        </div>

        {/* Unidades Produzidas (Corte e Solda) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unidades (Corte e Solda)</span>
            <Package className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {currentMetrics.quantidadeUnidades > 0
                ? currentMetrics.quantidadeUnidades.toLocaleString('pt-BR')
                : '0'}
            </span>
            <span className="text-xs text-slate-500">peças/sacos</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Velocidade CS:</span>
            <strong className="font-mono text-violet-700">
              {currentMetrics.produtividadeUnidadesHora > 0
                ? `${currentMetrics.produtividadeUnidadesHora.toLocaleString('pt-BR')} unid/h`
                : '—'}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. RESUMO DOS 3 SETORES INDUSTRIAIS (Cards Clicáveis para Filtro Rápido) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Resumo por Setor Produtivo</h3>
          </div>
          <span className="text-xs text-slate-500">Clique em um setor para filtrar o painel</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {setorData.map((item) => {
            const isSelected = filters.setorId === item.setor.id;
            return (
              <div
                key={item.setor.id}
                onClick={() => handleSetorCardClick(item.setor.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-indigo-700 border border-slate-200">
                      {item.setor.codigo}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{item.setor.nome}</h4>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                      item.metrics.percentualPerda <= metaGeralPerda
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Perda: {item.metrics.percentualPerda.toFixed(2)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Produção Líquida:</span>
                    <strong className="font-mono text-slate-900 text-sm">
                      {item.metrics.totalLiquidoKg.toLocaleString('pt-BR')} kg
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Produtividade:</span>
                    <strong className="font-mono text-slate-900 text-sm">
                      {item.metrics.produtividadeKgHora > 0
                        ? `${item.metrics.produtividadeKgHora.toFixed(1)} kg/h`
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Refugo Acumulado:</span>
                    <strong className="font-mono text-rose-600">
                      {item.metrics.totalRefugoKg} kg ({item.metrics.percentualRefugo.toFixed(2)}%)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tempo Parado:</span>
                    <strong className="font-mono text-amber-600">
                      {formatMinutesToHoursAndMinutes(item.metrics.tempoParadoMinutos)}
                    </strong>
                  </div>
                </div>

                {/* Específico para Corte e Solda */}
                {item.setor.id === 'set-cs' && item.metrics.quantidadeUnidades > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100/70 flex items-center justify-between text-xs text-violet-700 bg-violet-50/50 p-2 rounded-lg">
                    <span>Unidades Produzidas:</span>
                    <strong className="font-mono font-bold">
                      {item.metrics.quantidadeUnidades.toLocaleString('pt-BR')} peças
                    </strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. GRÁFICOS INDUSTRIAIS: DISTRIBUIÇÃO POR SETOR E EVOLUÇÃO TEMPORAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Produção por Setor (Volume kg e % do total) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Produção por Setor (kg)</h3>
              <p className="text-xs text-slate-500">Participação de cada setor no volume líquido total</p>
            </div>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>

          {currentMetrics.totalLiquidoKg === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum dado de produção registrado no período selecionado.
            </div>
          ) : (
            <div className="space-y-3.5">
              {setorData.map((item) => {
                const percentDoTotal =
                  currentMetrics.totalLiquidoKg > 0
                    ? (item.metrics.totalLiquidoKg / currentMetrics.totalLiquidoKg) * 100
                    : 0;
                return (
                  <div key={item.setor.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{item.setor.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {item.metrics.totalLiquidoKg.toLocaleString('pt-BR')} kg
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ({percentDoTotal.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    {/* Barra de Progresso com Escala Visual */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(3, Math.min(100, percentDoTotal))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico 2: Evolução Temporal da Produção / Perdas */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evolução Temporal</h3>
              <p className="text-xs text-slate-500">Acompanhamento diário das variáveis de produção</p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedTimelineMetric('producao')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  selectedTimelineMetric === 'producao'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Volume Líquido (kg)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimelineMetric('perda')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  selectedTimelineMetric === 'perda'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Taxa de Perda (%)
              </button>
            </div>
          </div>

          {timelineData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum dado temporal disponível no período selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Gráfico Interativo em SVG */}
              <div className="h-44 w-full relative">
                {selectedTimelineMetric === 'producao' ? (
                  <TimelineProductionSvg dataPoints={timelineData} />
                ) : (
                  <TimelineLossSvg dataPoints={timelineData} metaPerda={metaGeralPerda} />
                )}
              </div>

              {/* Legenda Explicativa */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                {selectedTimelineMetric === 'producao' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" />
                      <span>Produção Boa Líquida (kg)</span>
                    </div>
                    <span>Total de {timelineData.length} data(s) apontadas</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                        <span>% de Perda Ponderado</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 border-t-2 border-dashed border-emerald-600 inline-block" />
                        <span>Meta Corporativa ({metaGeralPerda}%)</span>
                      </div>
                    </div>
                    <span>Menor que a meta = Excelente</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. ANÁLISE POR MÁQUINA: PRODUÇÃO E GARGALOS DE PERDA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Produção por Máquina */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Produção por Máquina (kg)</h3>
              <p className="text-xs text-slate-500">Ranking ordenado pelo maior volume líquido fabricado</p>
            </div>
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>

          {maquinaData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma máquina com lançamentos no período.
            </div>
          ) : (
            <div className="space-y-3">
              {maquinaData.map((item) => {
                const maxVal = maquinaData[0]?.metrics.totalLiquidoKg || 1;
                const pct = maxVal > 0 ? (item.metrics.totalLiquidoKg / maxVal) * 100 : 0;
                return (
                  <div key={item.maquina.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">
                          {item.maquina.nome}
                        </span>
                        {item.setor && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold">
                            {item.setor.nome}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {item.metrics.totalLiquidoKg.toLocaleString('pt-BR')} kg
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Refugo: {item.metrics.totalRefugoKg} kg</span>
                      <span>
                        Produtividade:{' '}
                        {item.metrics.produtividadeKgHora > 0
                          ? `${item.metrics.produtividadeKgHora.toFixed(1)} kg/h`
                          : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* % de Perda por Máquina (Identificação de Gargalos) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">% de Perda por Máquina</h3>
              <p className="text-xs text-slate-500">Ordenado da maior perda para menor (foco em gargalos)</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>

          {maquinaData.filter((m) => m.metrics.totalBrutoKg > 0).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma máquina com matéria-prima lançada no período.
            </div>
          ) : (
            <div className="space-y-3">
              {[...maquinaData]
                .filter((m) => m.metrics.totalBrutoKg > 0)
                .sort((a, b) => b.metrics.percentualPerda - a.metrics.percentualPerda)
                .map((item) => {
                  const isAboveMeta = item.metrics.percentualPerda > metaGeralPerda;
                  return (
                    <div
                      key={item.maquina.id}
                      className={`p-2.5 rounded-xl border space-y-1 ${
                        isAboveMeta
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-emerald-50/40 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate max-w-[200px]">
                            {item.maquina.nome}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                            isAboveMeta
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.metrics.percentualPerda.toFixed(2)}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAboveMeta ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(5, item.metrics.percentualPerda * 20))}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Perda: {item.metrics.totalPerdaKg} kg de {item.metrics.totalBrutoKg} kg</span>
                        <span className={isAboveMeta ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {isAboveMeta ? `Acima da meta (+${(item.metrics.percentualPerda - metaGeralPerda).toFixed(2)}%)` : 'Dentro da meta'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* 6. OPERADORES: DOIS BLOCOS CLAROS (Maiores Produtores & Menor % de Perda) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bloco A: Maiores Produtores (kg produzidos) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Operadores: Maiores Produtores</h3>
                <p className="text-xs text-slate-500">Ordenado por volume total líquido produzido (kg)</p>
              </div>
            </div>
          </div>

          {topProdutores.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum operador com lançamentos no período selecionado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProdutores.map((item, idx) => (
                <div
                  key={item.operador.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {idx + 1}º
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{item.operador.nome}</span>
                      <span className="text-[11px] text-slate-500">
                        {item.setor?.nome || 'Produção'} • {item.metrics.totalLancamentos} turno(s)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-slate-900 text-sm block">
                      {item.metrics.totalLiquidoKg.toLocaleString('pt-BR')} kg
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.metrics.produtividadeKgHora > 0
                        ? `${item.metrics.produtividadeKgHora.toFixed(1)} kg/h`
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco B: Menor % de Perda (Qualidade) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Operadores: Menor % de Perda</h3>
                <p className="text-xs text-slate-500">Exibindo obrigatoriamente a quantidade de kg produzida ao lado</p>
              </div>
            </div>
          </div>

          {topMenorPerda.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum operador com matéria-prima apontada no período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topMenorPerda.map((item, idx) => (
                <div
                  key={item.operador.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                        idx === 0
                          ? 'bg-emerald-600 text-white'
                          : idx === 1
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-400 text-white'
                      }`}
                    >
                      {idx + 1}º
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{item.operador.nome}</span>
                      <span className="text-[11px] text-slate-500">
                        Produziu: <strong className="font-mono text-slate-700">{item.metrics.totalLiquidoKg.toLocaleString('pt-BR')} kg</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-700 text-sm block">
                      {item.metrics.percentualPerda.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Perda: {item.metrics.totalPerdaKg} kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7. GARGALOS OPERACIONAIS: TEMPO PARADO E PARETO DE MOTIVOS DE PARADA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Análise de Paradas de Máquina (Curva de Pareto)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Identificação dos 20% de motivos responsáveis por 80% do tempo de inatividade fabril
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('paradas')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            <span>Ver módulo de paradas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {paretoParadas.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma parada de máquina apontada para os lançamentos do período selecionado.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabela Estruturada de Pareto */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase">
                    <th className="pb-2">Motivo da Parada</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-center">Ocorrências</th>
                    <th className="pb-2 text-right">Tempo Total</th>
                    <th className="pb-2 text-right">% Relativo</th>
                    <th className="pb-2 text-right">% Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paretoParadas.map((p, idx) => (
                    <tr key={p.motivoId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pr-2">
                        <span className="font-mono font-bold text-slate-700 mr-2">{p.codigo}</span>
                        <span className="font-semibold text-slate-900">{p.descricao}</span>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.tipo === 'programada'
                              ? 'bg-blue-50 text-blue-700'
                              : p.tipo === 'nao_programada'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {p.tipo === 'programada'
                            ? 'Programada'
                            : p.tipo === 'nao_programada'
                            ? 'Não Programada'
                            : 'Operacional'}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-mono font-semibold text-slate-800">
                        {p.ocorrencias}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        {p.tempoMinutos} min <span className="text-[10px] text-slate-400 font-normal">({p.tempoHoras}h)</span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-amber-700">
                        {p.percentualSobreTotal}%
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`font-mono font-black px-2 py-0.5 rounded text-[11px] ${
                            p.percentualAcumulado <= 80
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.percentualAcumulado}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Barra Visual de Impacto de Pareto */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Distribuição de impacto acumulado:
              </span>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                {paretoParadas.slice(0, 5).map((p, i) => {
                  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-slate-400'];
                  return (
                    <div
                      key={p.motivoId}
                      className={`h-full ${colors[i % colors.length]}`}
                      style={{ width: `${p.percentualSobreTotal}%` }}
                      title={`${p.descricao}: ${p.percentualSobreTotal}%`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 8. DETALHAMENTO DE LANÇAMENTOS DO PERÍODO (DRILL-DOWN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          onClick={() => setShowDrilldownTable(!showDrilldownTable)}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ListFilter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Lançamentos que Compõem o Período ({currentLancamentos.length} registros)
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria e conferência detalhada dos apontamentos filtrados no Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600">
              {showDrilldownTable ? 'Ocultar detalhes' : 'Ver todos os lançamentos'}
            </span>
            {showDrilldownTable ? (
              <ChevronUp className="w-4 h-4 text-indigo-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-600" />
            )}
          </div>
        </div>

        {showDrilldownTable && (
          <div className="p-5 pt-0 border-t border-slate-100 overflow-x-auto">
            {currentLancamentos.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum lançamento encontrado para os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase">
                    <th className="py-2.5">Data</th>
                    <th className="py-2.5">Setor / Máquina</th>
                    <th className="py-2.5">Operador</th>
                    <th className="py-2.5">OP / Produto</th>
                    <th className="py-2.5 text-right">Bruto</th>
                    <th className="py-2.5 text-right">Líquido</th>
                    <th className="py-2.5 text-right">Perda</th>
                    <th className="py-2.5 text-right">Refugo</th>
                    <th className="py-2.5 text-right">% Perda</th>
                    <th className="py-2.5 text-right">Parada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentLancamentos.map((l) => {
                    const setor = data.setores.find((s) => s.id === l.setorId);
                    const maquina = data.maquinas.find((m) => m.id === l.maquinaId);
                    const operador = data.operadores.find((o) => o.id === l.operadorId);
                    const produto = data.produtos.find((p) => p.id === l.produtoId);

                    return (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-mono font-medium text-slate-800">
                          {formatYMDToBR(l.data)}
                        </td>
                        <td className="py-2.5">
                          <span className="font-bold text-slate-900 block">{maquina?.nome || l.maquinaId}</span>
                          <span className="text-[11px] text-slate-500">{setor?.nome}</span>
                        </td>
                        <td className="py-2.5 font-medium text-slate-800">
                          {operador?.nome || '—'}
                        </td>
                        <td className="py-2.5">
                          <span className="font-mono text-slate-700 block">{l.ordemProducao || 'S/ OP'}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[140px] block">
                            {produto?.descricao || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-slate-800">
                          {l.quantidadeBrutaKg} kg
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                          {l.quantidadeLiquidaKg} kg
                        </td>
                        <td className="py-2.5 text-right font-mono text-amber-700">
                          {l.perdaKg || 0} kg
                        </td>
                        <td className="py-2.5 text-right font-mono text-rose-700">
                          {l.refugoKg || 0} kg
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {l.percentualPerda.toFixed(2)}%
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          {l.tempoParadoMinutos > 0 ? `${l.tempoParadoMinutos} min` : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 9. MODAL DE AUDITORIA DA REGRA CRÍTICA (Validação Matemática Ponderada) */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Auditoria Formal: Regra de Cálculo dos Indicadores
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-indigo-50 text-indigo-950 rounded-xl border border-indigo-100">
                <strong className="block text-indigo-900 font-bold mb-1">
                  Diretriz Rígida da Fábrica:
                </strong>
                NUNCA calcular os indicadores consolidados fazendo média simples dos percentuais dos lançamentos.
                Os percentuais consolidados DEVEM SEMPRE ser calculados a partir dos totais absolutos somados.
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="text-slate-700 font-bold">Teste de Validação Automática:</div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div>• Lançamento A: 100 kg bruto, 1 kg perda (1,00%)</div>
                  <div>• Lançamento B: 1.000 kg bruto, 40 kg perda (4,00%)</div>
                  <div className="text-rose-600">✕ Média simples (incorreta): (1% + 4%) / 2 = 2,50%</div>
                  <div className="text-emerald-700 font-bold">
                    ✓ Consolidação ponderada (correta): 41 kg / 1.100 kg = {auditResult.weightedPercent}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Status da verificação do sistema: {auditResult.isValid ? '100% Aprovado e Ativo' : 'Falha'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Badge de variação com seta e cores adequadas
 */
function VariationBadge({
  comparison,
  unit,
  lowerIsBetter = false,
  isPercent = false,
}: {
  comparison: {
    diff: number;
    percentChange: number | null;
    trend: 'up' | 'down' | 'equal';
    isFavorable: boolean | null;
  };
  unit?: string;
  lowerIsBetter?: boolean;
  isPercent?: boolean;
}) {
  if (comparison.trend === 'equal' || comparison.percentChange === null) {
    return (
      <span className="text-[11px] text-slate-400 font-mono">
        — estável
      </span>
    );
  }

  const isGood = comparison.isFavorable;
  const isUp = comparison.trend === 'up';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
        isGood
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
    >
      {isUp ? (
        <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
      ) : (
        <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
      )}
      <span>
        {comparison.percentChange > 0 ? `+${comparison.percentChange}%` : `${comparison.percentChange}%`}
      </span>
    </span>
  );
}

/**
 * Gráfico SVG de Linha e Área para Evolução de Produção Líquida
 */
function TimelineProductionSvg({ dataPoints }: { dataPoints: any[] }) {
  if (!dataPoints || dataPoints.length === 0) return null;

  const maxVal = Math.max(...dataPoints.map((d) => d.totalLiquidoKg), 100);
  const width = 600;
  const height = 150;
  const padding = 20;

  // Pontos de coordenadas
  const points = dataPoints.map((d, index) => {
    const x =
      dataPoints.length === 1
        ? width / 2
        : padding + (index / (dataPoints.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.totalLiquidoKg / maxVal) * (height - 2 * padding);
    return { x, y, val: d.totalLiquidoKg, label: d.label };
  });

  const pathD =
    points.length === 1
      ? `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`
      : points.reduce(
          (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
          ''
        );

  const areaD =
    points.length === 1
      ? ''
      : `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Linhas de grade horizontais sutis */}
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />
      <line
        x1={padding}
        y1={height / 2}
        x2={width - padding}
        y2={height / 2}
        stroke="#e2e8f0"
        strokeDasharray="3 3"
      />
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#cbd5e1"
      />

      {/* Área preenchida */}
      {areaD && <path d={areaD} fill="url(#prodGrad)" />}

      {/* Linha principal */}
      <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />

      {/* Círculos de dados com tooltips de SVG */}
      {points.map((p, i) => (
        <g key={i} className="cursor-pointer group">
          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
          <circle
            cx={p.x}
            cy={p.y}
            r="8"
            fill="#4f46e5"
            fillOpacity="0"
            className="group-hover:fill-opacity-20 transition-all"
          />
          <text
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            className="text-[10px] font-mono font-bold fill-slate-800"
          >
            {p.val.toLocaleString('pt-BR')} kg
          </text>
          <text
            x={p.x}
            y={height - 5}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-slate-400"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Gráfico SVG de Linha para Taxa de Perda com Linha de Meta Corporativa
 */
function TimelineLossSvg({
  dataPoints,
  metaPerda,
}: {
  dataPoints: any[];
  metaPerda: number;
}) {
  if (!dataPoints || dataPoints.length === 0) return null;

  const maxVal = Math.max(...dataPoints.map((d) => d.percentualPerda), metaPerda * 1.5, 4);
  const width = 600;
  const height = 150;
  const padding = 20;

  const points = dataPoints.map((d, index) => {
    const x =
      dataPoints.length === 1
        ? width / 2
        : padding + (index / (dataPoints.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.percentualPerda / maxVal) * (height - 2 * padding);
    return { x, y, val: d.percentualPerda, label: d.label };
  });

  const pathD =
    points.length === 1
      ? `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`
      : points.reduce(
          (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
          ''
        );

  const metaY = height - padding - (metaPerda / maxVal) * (height - 2 * padding);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {/* Linha de Meta tracejada */}
      <line
        x1={padding}
        y1={metaY}
        x2={width - padding}
        y2={metaY}
        stroke="#10b981"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <text
        x={width - padding}
        y={metaY - 4}
        textAnchor="end"
        className="text-[10px] font-mono font-bold fill-emerald-700"
      >
        Meta: {metaPerda}%
      </text>

      {/* Linha base */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#cbd5e1"
      />

      {/* Linha de dados de perda */}
      <path d={pathD} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />

      {/* Pontos de dados */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#e11d48" strokeWidth="2.5" />
          <text
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            className="text-[10px] font-mono font-bold fill-rose-700"
          >
            {p.val.toFixed(2)}%
          </text>
          <text
            x={p.x}
            y={height - 5}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-slate-400"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
