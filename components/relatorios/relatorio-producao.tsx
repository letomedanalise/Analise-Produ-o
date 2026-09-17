'use client';

import React, { useState, useMemo } from 'react';
import { LancamentoProducao } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  ConsolidatedMetrics,
  formatPtBrKg,
  formatPtBrUn,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
  formatYMDToBR,
  groupLancamentosDiario,
  groupLancamentosSemanal,
  groupLancamentosMensal,
  compareMesesA_vs_B,
  groupLancamentosBySetor,
  consolidateLancamentos,
} from '@/lib/production-analytics';
import {
  Calendar,
  CalendarRange,
  Layers,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Sparkles,
  Search,
} from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

type ProducaoSubTab = 'diario' | 'semanal' | 'mensal' | 'comparacao' | 'setores';

interface RelatorioProducaoProps {
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioProducao({ lancamentos, periodoRotulo }: RelatorioProducaoProps) {
  const { data } = useProductionDB();
  const [subTab, setSubTab] = useState<ProducaoSubTab>('diario');
  const [sortOrderDiario, setSortOrderDiario] = useState<'desc' | 'asc'>('desc');

  // Estado da Comparação Mensal
  const [anoComparacao, setAnoComparacao] = useState<number>(2026);
  const [mesA, setMesA] = useState<number>(8); // Agosto
  const [mesB, setMesB] = useState<number>(7); // Julho

  // Estado da Comparação Semanal
  const [semanaAKey, setSemanaAKey] = useState<string>('');
  const [semanaBKey, setSemanaBKey] = useState<string>('');

  // Modal de Auditoria
  const [modalAuditoria, setModalAuditoria] = useState<{
    isOpen: boolean;
    titulo: string;
    subtitulo: string;
    lancamentos: LancamentoProducao[];
  }>({
    isOpen: false,
    titulo: '',
    subtitulo: '',
    lancamentos: [],
  });

  // Agrupamentos
  const diarioItems = useMemo(() => {
    const items = groupLancamentosDiario(lancamentos);
    return items.sort((a, b) => (sortOrderDiario === 'desc' ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)));
  }, [lancamentos, sortOrderDiario]);

  const semanalItems = useMemo(() => {
    return groupLancamentosSemanal(lancamentos);
  }, [lancamentos]);

  const effectiveSemanaAKey = semanaAKey || (semanalItems.length > 0 ? semanalItems[0].semanaKey : '');
  const effectiveSemanaBKey = semanaBKey || (semanalItems.length > 1 ? semanalItems[1].semanaKey : effectiveSemanaAKey);

  const mensalData = useMemo(() => {
    return groupLancamentosMensal(data.lancamentosProducao, anoComparacao);
  }, [data.lancamentosProducao, anoComparacao]);

  const comparacaoMeses = useMemo(() => {
    const lancsA = data.lancamentosProducao.filter((l) => {
      const [y, m] = l.data.split('-').map(Number);
      return y === anoComparacao && m === mesA;
    });
    const lancsB = data.lancamentosProducao.filter((l) => {
      const [y, m] = l.data.split('-').map(Number);
      return y === anoComparacao && m === mesB;
    });
    const mesesNomes = [
      '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return {
      rotuloA: `${mesesNomes[mesA]}/${anoComparacao}`,
      rotuloB: `${mesesNomes[mesB]}/${anoComparacao}`,
      comparacoes: compareMesesA_vs_B(lancsA, lancsB, `${mesesNomes[mesA]}/${anoComparacao}`, `${mesesNomes[mesB]}/${anoComparacao}`),
      lancsA,
      lancsB,
    };
  }, [data.lancamentosProducao, anoComparacao, mesA, mesB]);

  const setoresItems = useMemo(() => {
    return groupLancamentosBySetor(lancamentos, data.setores);
  }, [lancamentos, data.setores]);

  const abrirAuditoria = (titulo: string, subtitulo: string, lista: LancamentoProducao[]) => {
    setModalAuditoria({
      isOpen: true,
      titulo,
      subtitulo,
      lancamentos: lista,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-navegação interna de Produção */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto print:hidden">
        <button
          type="button"
          onClick={() => setSubTab('diario')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
            subTab === 'diario'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Produção Diária ({diarioItems.length} dias)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('semanal')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
            subTab === 'semanal'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Produção Semanal ({semanalItems.length} sem.)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('mensal')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
            subTab === 'mensal'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Produção Mensal / Ano
        </button>
        <button
          type="button"
          onClick={() => setSubTab('comparacao')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
            subTab === 'comparacao'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Comparação Mensal (Mês A vs B)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('setores')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
            subTab === 'setores'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Balanço por Setor
        </button>
      </div>

      {/* 1. VISÃO DIÁRIA */}
      {subTab === 'diario' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Relatório de Produção Diária</h3>
              <p className="text-xs text-slate-500">
                Acompanhamento diário com desmembramento por setor. Clique em qualquer data para auditar as ordens.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSortOrderDiario((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <span>Data: {sortOrderDiario === 'desc' ? 'Mais recentes' : 'Mais antigas'}</span>
                {sortOrderDiario === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {diarioItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">Sem dados no período selecionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Data / Dia</th>
                    <th className="py-2.5 px-3 text-right">Extrusora (kg)</th>
                    <th className="py-2.5 px-3 text-right">Impressão (kg)</th>
                    <th className="py-2.5 px-3 text-right">Corte e Solda (kg)</th>
                    <th className="py-2.5 px-3 text-right">Total Boa (kg)</th>
                    <th className="py-2.5 px-3 text-right">Unidades (un)</th>
                    <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                    <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                    <th className="py-2.5 px-3 text-right">% Perda</th>
                    <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                    <th className="py-2.5 px-3 text-right">Horas Trab.</th>
                    <th className="py-2.5 px-3 text-right">Produtividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {diarioItems.map((d) => (
                    <tr
                      key={d.data}
                      onClick={() =>
                        abrirAuditoria(
                          `Fechamento do Dia ${d.dataFormatada} (${d.diaSemana})`,
                          `${d.lancamentos.length} apontamentos registrados nesta data`,
                          d.lancamentos
                        )
                      }
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{d.dataFormatada}</span>
                        <span className="text-[10px] text-slate-400">{d.diaSemana}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatPtBrKg(d.extrusoraKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatPtBrKg(d.impressaoKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatPtBrKg(d.corteSoldaKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        {formatPtBrKg(d.metrics.totalLiquidoKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-purple-700">
                        {d.metrics.quantidadeUnidades > 0 ? formatPtBrUn(d.metrics.quantidadeUnidades) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                        {formatPtBrKg(d.metrics.totalPerdaKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600 font-medium">
                        {formatPtBrKg(d.metrics.totalRefugoKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                            d.metrics.percentualPerda <= 2.5
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {formatPtBrPercent(d.metrics.percentualPerda)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-medium whitespace-nowrap">
                        {formatPtBrHoursMin(d.metrics.tempoParadoMinutos)}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {formatPtBrHoursMin(d.metrics.tempoTrabalhadoMinutos)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                        {formatPtBrNumber(d.metrics.produtividadeKgHora)} kg/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. VISÃO SEMANAL */}
      {subTab === 'semanal' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Relatório de Produção Semanal</h3>
              <p className="text-xs text-slate-500">
                Agrupamento automático por semanas industriais (Segunda a Domingo) com consolidação ponderada de perdas.
              </p>
            </div>

            {semanalItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">Sem dados para o período informado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Semana</th>
                      <th className="py-2.5 px-3">Início</th>
                      <th className="py-2.5 px-3">Término</th>
                      <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                      <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                      <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                      <th className="py-2.5 px-3 text-right">% Perda</th>
                      <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                      <th className="py-2.5 px-3 text-right">Horas Trab.</th>
                      <th className="py-2.5 px-3 text-right">Produtividade</th>
                      <th className="py-2.5 px-3 text-right">Apontamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {semanalItems.map((s) => (
                      <tr
                        key={s.semanaKey}
                        onClick={() =>
                          abrirAuditoria(
                            s.semanaRotulo,
                            `Lançamentos da semana ${s.semanaNum}/${s.ano} (${formatYMDToBR(s.dataInicial)} a ${formatYMDToBR(s.dataFinal)})`,
                            s.lancamentos
                          )
                        }
                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                          Semana {s.semanaNum}/{s.ano}
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatYMDToBR(s.dataInicial)}</td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatYMDToBR(s.dataFinal)}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700">
                          {formatPtBrKg(s.metrics.totalLiquidoKg)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-600 font-medium">
                          {formatPtBrKg(s.metrics.totalPerdaKg)}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-600 font-medium">
                          {formatPtBrKg(s.metrics.totalRefugoKg)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                              s.metrics.percentualPerda <= 2.5
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {formatPtBrPercent(s.metrics.percentualPerda)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-amber-700 font-medium whitespace-nowrap">
                          {formatPtBrHoursMin(s.metrics.tempoParadoMinutos)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {formatPtBrHoursMin(s.metrics.tempoTrabalhadoMinutos)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                          {formatPtBrNumber(s.metrics.produtividadeKgHora)} kg/h
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-600">{s.lancamentos.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comparador de Semanas */}
          {semanalItems.length >= 2 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Comparar Semanas Diretamente</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={effectiveSemanaAKey}
                    onChange={(e) => setSemanaAKey(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-800"
                  >
                    {semanalItems.map((s) => (
                      <option key={`a-${s.semanaKey}`} value={s.semanaKey}>
                        Semana {s.semanaNum} ({formatYMDToBR(s.dataInicial)})
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-slate-400">vs</span>
                  <select
                    value={effectiveSemanaBKey}
                    onChange={(e) => setSemanaBKey(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-800"
                  >
                    {semanalItems.map((s) => (
                      <option key={`b-${s.semanaKey}`} value={s.semanaKey}>
                        Semana {s.semanaNum} ({formatYMDToBR(s.dataInicial)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const semA = semanalItems.find((s) => s.semanaKey === effectiveSemanaAKey);
                const semB = semanalItems.find((s) => s.semanaKey === effectiveSemanaBKey);
                if (!semA || !semB) return null;

                const comparacoes = compareMesesA_vs_B(
                  semA.lancamentos,
                  semB.lancamentos,
                  semA.semanaRotulo,
                  semB.semanaRotulo
                );

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Indicador</th>
                          <th className="py-2.5 px-3 text-right">Semana {semA.semanaNum}</th>
                          <th className="py-2.5 px-3 text-right">Semana {semB.semanaNum}</th>
                          <th className="py-2.5 px-3 text-right">Diferença Absoluta</th>
                          <th className="py-2.5 px-3 text-right">Variação %</th>
                          <th className="py-2.5 px-3 text-center">Desempenho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {comparacoes.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.indicador}</td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {item.unidade === '%'
                                ? formatPtBrPercent(item.valorA)
                                : item.unidade === 'kg'
                                ? formatPtBrKg(item.valorA)
                                : item.unidade === 'min'
                                ? formatPtBrHoursMin(item.valorA)
                                : `${formatPtBrNumber(item.valorA)} ${item.unidade}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-500">
                              {item.unidade === '%'
                                ? formatPtBrPercent(item.valorB)
                                : item.unidade === 'kg'
                                ? formatPtBrKg(item.valorB)
                                : item.unidade === 'min'
                                ? formatPtBrHoursMin(item.valorB)
                                : `${formatPtBrNumber(item.valorB)} ${item.unidade}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              {item.diferenca > 0 ? `+${formatPtBrNumber(item.diferenca)}` : formatPtBrNumber(item.diferenca)}{' '}
                              {item.unidade}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              {item.variacaoPercent !== null
                                ? `${item.variacaoPercent > 0 ? '+' : ''}${formatPtBrNumber(item.variacaoPercent, 1)}%`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  item.status === 'MELHOROU'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.status === 'PIOROU'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.status === 'MELHOROU' && <CheckCircle2 className="w-3 h-3" />}
                                {item.status === 'PIOROU' && <AlertTriangle className="w-3 h-3" />}
                                {item.status === 'ESTÁVEL' && <Minus className="w-3 h-3" />}
                                <span>{item.status}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 3. VISÃO MENSAL */}
      {subTab === 'mensal' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Relatório de Produção Mensal ({anoComparacao})</h3>
              <p className="text-xs text-slate-500">
                Resumo por mês civil do ano selecionado. Os percentuais do TOTAL DO ANO são recalculados a partir dos
                valores absolutos somados (sem média simples).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Ano de Exercício:</label>
              <select
                value={anoComparacao}
                onChange={(e) => setAnoComparacao(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Mês</th>
                  <th className="py-2.5 px-3 text-right">Extrusora (kg)</th>
                  <th className="py-2.5 px-3 text-right">Impressão (kg)</th>
                  <th className="py-2.5 px-3 text-right">Corte e Solda (kg)</th>
                  <th className="py-2.5 px-3 text-right">Total Boa (kg)</th>
                  <th className="py-2.5 px-3 text-right">Unidades (un)</th>
                  <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                  <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                  <th className="py-2.5 px-3 text-right">% Perda</th>
                  <th className="py-2.5 px-3 text-right">Aproveitamento</th>
                  <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                  <th className="py-2.5 px-3 text-right">Horas Trab.</th>
                  <th className="py-2.5 px-3 text-right">Produtividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {mensalData.meses.map((m) => {
                  const hasData = m.lancamentos.length > 0;
                  return (
                    <tr
                      key={m.mesAnoKey}
                      onClick={() =>
                        hasData &&
                        abrirAuditoria(
                          `Mês de ${m.mesNome}/${m.ano}`,
                          `${m.lancamentos.length} apontamentos registrados em ${m.mesNome}`,
                          m.lancamentos
                        )
                      }
                      className={`${hasData ? 'hover:bg-indigo-50/50 cursor-pointer' : 'opacity-40'} transition-colors`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{m.mesNome}</td>
                      <td className="py-2.5 px-3 text-right">{hasData ? formatPtBrKg(m.extrusoraKg) : '—'}</td>
                      <td className="py-2.5 px-3 text-right">{hasData ? formatPtBrKg(m.impressaoKg) : '—'}</td>
                      <td className="py-2.5 px-3 text-right">{hasData ? formatPtBrKg(m.corteSoldaKg) : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        {hasData ? formatPtBrKg(m.metrics.totalLiquidoKg) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {hasData && m.metrics.quantidadeUnidades > 0 ? formatPtBrUn(m.metrics.quantidadeUnidades) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                        {hasData ? formatPtBrKg(m.metrics.totalPerdaKg) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600 font-medium">
                        {hasData ? formatPtBrKg(m.metrics.totalRefugoKg) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {hasData ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                              m.metrics.percentualPerda <= 2.5
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {formatPtBrPercent(m.metrics.percentualPerda)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {hasData ? formatPtBrPercent(m.metrics.percentualAproveitamento) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-700 whitespace-nowrap">
                        {hasData ? formatPtBrHoursMin(m.metrics.tempoParadoMinutos) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {hasData ? formatPtBrHoursMin(m.metrics.tempoTrabalhadoMinutos) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                        {hasData ? `${formatPtBrNumber(m.metrics.produtividadeKgHora)} kg/h` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-3">TOTAL DO ANO ({anoComparacao})</td>
                  <td className="py-3 px-3 text-right">
                    {formatPtBrKg(
                      mensalData.meses.reduce((acc, m) => acc + m.extrusoraKg, 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatPtBrKg(
                      mensalData.meses.reduce((acc, m) => acc + m.impressaoKg, 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatPtBrKg(
                      mensalData.meses.reduce((acc, m) => acc + m.corteSoldaKg, 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800">
                    {formatPtBrKg(mensalData.totalAno.totalLiquidoKg)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {mensalData.totalAno.quantidadeUnidades > 0 ? formatPtBrUn(mensalData.totalAno.quantidadeUnidades) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700">{formatPtBrKg(mensalData.totalAno.totalPerdaKg)}</td>
                  <td className="py-3 px-3 text-right text-amber-700">{formatPtBrKg(mensalData.totalAno.totalRefugoKg)}</td>
                  <td className="py-3 px-3 text-right text-rose-700 font-black">
                    {formatPtBrPercent(mensalData.totalAno.percentualPerda)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800">
                    {formatPtBrPercent(mensalData.totalAno.percentualAproveitamento)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700">
                    {formatPtBrHoursMin(mensalData.totalAno.tempoParadoMinutos)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatPtBrHoursMin(mensalData.totalAno.tempoTrabalhadoMinutos)}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-800">
                    {formatPtBrNumber(mensalData.totalAno.produtividadeKgHora)} kg/h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 4. COMPARAÇÃO MENSAL (MÊS A vs MÊS B) */}
      {subTab === 'comparacao' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Comparação Mensal Direta (Mês A versus Mês B)</h3>
                <p className="text-xs text-slate-500">
                  Análise qualitativa e quantitativa da evolução industrial entre dois meses do ano.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-indigo-700">Mês A:</span>
                <select
                  value={mesA}
                  onChange={(e) => setMesA(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={`opt-a-${m}`} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-bold text-slate-400">versus</span>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600">Mês B:</span>
                <select
                  value={mesB}
                  onChange={(e) => setMesB(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={`opt-b-${m}`} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Indicador Operacional</th>
                  <th className="py-2.5 px-3 text-right">
                    {comparacaoMeses.rotuloA} (A)
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {comparacaoMeses.rotuloB} (B)
                  </th>
                  <th className="py-2.5 px-3 text-right">Diferença Absoluta</th>
                  <th className="py-2.5 px-3 text-right">Variação %</th>
                  <th className="py-2.5 px-3 text-center">Interpretação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {comparacaoMeses.comparacoes.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{item.indicador}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {item.unidade === '%'
                        ? formatPtBrPercent(item.valorA)
                        : item.unidade === 'kg'
                        ? formatPtBrKg(item.valorA)
                        : item.unidade === 'min'
                        ? formatPtBrHoursMin(item.valorA)
                        : `${formatPtBrNumber(item.valorA)} ${item.unidade}`}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                      {item.unidade === '%'
                        ? formatPtBrPercent(item.valorB)
                        : item.unidade === 'kg'
                        ? formatPtBrKg(item.valorB)
                        : item.unidade === 'min'
                        ? formatPtBrHoursMin(item.valorB)
                        : `${formatPtBrNumber(item.valorB)} ${item.unidade}`}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">
                      {item.diferenca > 0 ? `+${formatPtBrNumber(item.diferenca)}` : formatPtBrNumber(item.diferenca)}{' '}
                      {item.unidade}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {item.variacaoPercent !== null
                        ? `${item.variacaoPercent > 0 ? '+' : ''}${formatPtBrNumber(item.variacaoPercent, 1)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'MELHOROU'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'PIOROU'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.status === 'MELHOROU' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {item.status === 'PIOROU' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.status === 'ESTÁVEL' && <Minus className="w-3.5 h-3.5" />}
                        <span>{item.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Lógica Industrial de Avaliação:</p>
            <p className="text-[11px]">
              • <strong>Menor Perda / Refugo / Tempo Parado = MELHOROU</strong> (redução de custos e desperdício de material e tempo).
            </p>
            <p className="text-[11px]">
              • <strong>Maior Produção / Produtividade / Aproveitamento = MELHOROU</strong> (ganho de rendimento da fábrica).
            </p>
          </div>
        </div>
      )}

      {/* 5. VISÃO POR SETOR */}
      {subTab === 'setores' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Relatório Consolidado por Setor</h3>
            <p className="text-xs text-slate-500">
              Comparação direta entre Extrusora, Impressão e Corte & Solda no período selecionado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {setoresItems.map((item) => (
              <div
                key={item.setor.id}
                onClick={() =>
                  abrirAuditoria(
                    `Ordens do Setor: ${item.setor.nome}`,
                    `Todos os apontamentos no período`,
                    lancamentos.filter((l) => l.setorId === item.setor.id)
                  )
                }
                className="bg-slate-50/70 border border-slate-200 hover:border-indigo-400 p-4 rounded-xl cursor-pointer transition-all hover:shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-sm">{item.setor.nome}</h4>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {item.metrics.totalLancamentos} ordens
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Produção Boa:</span>
                    <span className="font-bold text-emerald-700">{formatPtBrKg(item.metrics.totalLiquidoKg)}</span>
                  </div>
                  {item.metrics.quantidadeUnidades > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unidades:</span>
                      <span className="font-bold text-purple-700">{formatPtBrUn(item.metrics.quantidadeUnidades)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perdas Setup:</span>
                    <span className="font-medium text-rose-600">{formatPtBrKg(item.metrics.totalPerdaKg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Refugo:</span>
                    <span className="font-medium text-amber-600">{formatPtBrKg(item.metrics.totalRefugoKg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">% Perda:</span>
                    <span className="font-bold text-rose-700">{formatPtBrPercent(item.metrics.percentualPerda)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aproveitamento:</span>
                    <span className="font-bold text-emerald-700">
                      {formatPtBrPercent(item.metrics.percentualAproveitamento)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tempo Parado:</span>
                    <span className="font-medium text-amber-700">{formatPtBrHoursMin(item.metrics.tempoParadoMinutos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Produtividade:</span>
                    <span className="font-bold text-indigo-700">{formatPtBrNumber(item.metrics.produtividadeKgHora)} kg/h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Auditoria dos Lançamentos */}
      <ModalAuditoriaLancamentos
        isOpen={modalAuditoria.isOpen}
        onClose={() => setModalAuditoria((prev) => ({ ...prev, isOpen: false }))}
        titulo={modalAuditoria.titulo}
        subtitulo={modalAuditoria.subtitulo}
        lancamentos={modalAuditoria.lancamentos}
      />
    </div>
  );
}
