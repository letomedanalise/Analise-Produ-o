'use client';

import React, { useState, useMemo } from 'react';
import { LancamentoProducao } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  ConsolidatedMetrics,
  formatPtBrKg,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
  formatYMDToBR,
  groupLancamentosBySetor,
  groupLancamentosByMaquina,
  groupLancamentosByOperador,
  groupLancamentosByProduto,
  groupLancamentosByTurno,
  groupLancamentosDiario,
  groupLancamentosSemanal,
  groupLancamentosMensal,
  consolidateLancamentos,
} from '@/lib/production-analytics';
import {
  TrendingDown,
  AlertTriangle,
  Layers,
  Cpu,
  User,
  Package,
  Clock,
  BarChart3,
  Calendar,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

interface RelatorioPerdasProps {
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioPerdas({ lancamentos, periodoRotulo }: RelatorioPerdasProps) {
  const { data } = useProductionDB();
  const [rankingMode, setRankingMode] = useState<'kg' | 'percent'>('kg');
  const [evolucaoMetrica, setEvolucaoMetrica] = useState<'kg' | 'percent'>('percent');
  const [evolucaoEscala, setEvolucaoEscala] = useState<'dia' | 'semana' | 'mes'>('dia');

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

  const consolidados = useMemo(() => consolidateLancamentos(lancamentos), [lancamentos]);

  // Agrupamentos
  const perdasPorSetor = useMemo(() => groupLancamentosBySetor(lancamentos, data.setores), [lancamentos, data.setores]);
  const perdasPorMaquina = useMemo(() => groupLancamentosByMaquina(lancamentos, data.maquinas, data.setores), [lancamentos, data.maquinas, data.setores]);
  const perdasPorOperador = useMemo(() => groupLancamentosByOperador(lancamentos, data.operadores, data.setores), [lancamentos, data.operadores, data.setores]);
  const perdasPorProduto = useMemo(() => groupLancamentosByProduto(lancamentos, data.produtos, data.maquinas), [lancamentos, data.produtos, data.maquinas]);
  const perdasPorTurno = useMemo(() => groupLancamentosByTurno(lancamentos, data.turnos), [lancamentos, data.turnos]);

  // Ranking de Máquinas ordenado por kg ou por %
  const maquinasRankeadas = useMemo(() => {
    const list = [...perdasPorMaquina];
    if (rankingMode === 'kg') {
      return list.sort((a, b) => b.metrics.totalPerdaKg - a.metrics.totalPerdaKg);
    }
    return list.sort((a, b) => b.metrics.percentualPerda - a.metrics.percentualPerda);
  }, [perdasPorMaquina, rankingMode]);

  // Produtos ordenados por perdas
  const produtosRankeados = useMemo(() => {
    return [...perdasPorProduto].sort((a, b) => b.metrics.percentualPerda - a.metrics.percentualPerda);
  }, [perdasPorProduto]);

  // Dados para Evolução de Perdas
  const dadosEvolucao = useMemo(() => {
    if (evolucaoEscala === 'dia') {
      const dias = groupLancamentosDiario(lancamentos);
      return dias.map((d) => ({
        rotulo: d.dataFormatada,
        valorKg: d.metrics.totalPerdaKg,
        valorPercent: d.metrics.percentualPerda,
        lancamentos: d.lancamentos,
      })).reverse();
    }
    if (evolucaoEscala === 'semana') {
      const semanas = groupLancamentosSemanal(lancamentos);
      return semanas.map((s) => ({
        rotulo: `Sem. ${s.semanaNum}`,
        valorKg: s.metrics.totalPerdaKg,
        valorPercent: s.metrics.percentualPerda,
        lancamentos: s.lancamentos,
      })).reverse();
    }
    // Mês
    const mensal = groupLancamentosMensal(data.lancamentosProducao, 2026);
    return mensal.meses.filter((m) => m.lancamentos.length > 0).map((m) => ({
      rotulo: m.mesNome.substring(0, 3),
      valorKg: m.metrics.totalPerdaKg,
      valorPercent: m.metrics.percentualPerda,
      lancamentos: m.lancamentos,
    }));
  }, [lancamentos, data.lancamentosProducao, evolucaoEscala]);

  const maxEvolucao = useMemo(() => {
    if (dadosEvolucao.length === 0) return 10;
    const vals = dadosEvolucao.map((d) => (evolucaoMetrica === 'kg' ? d.valorKg : d.valorPercent));
    return Math.max(...vals, evolucaoMetrica === 'percent' ? 4 : 10) * 1.15;
  }, [dadosEvolucao, evolucaoMetrica]);

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
      {/* 1. SEÇÃO PRINCIPAL: ONDE ESTAMOS PERDENDO MATERIAL? */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Onde estamos perdendo material?</h3>
              <p className="text-xs text-slate-500">
                Mapa termográfico de perdas e refugos distribuídos por todas as dimensões de chão de fábrica.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 block">Descarte Total do Período:</span>
            <span className="text-xl font-black text-rose-600">
              {formatPtBrKg(consolidados.totalDescarteKg)}
            </span>
          </div>
        </div>

        {/* Grade de Dimensões de Perda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Por Setor */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Perda por Setor</span>
              </div>
              <span className="text-[10px] text-slate-400">Ponderado</span>
            </div>
            <div className="space-y-2">
              {perdasPorSetor.map((s) => (
                <div
                  key={s.setor.id}
                  onClick={() =>
                    abrirAuditoria(
                      `Perdas no Setor: ${s.setor.nome}`,
                      `Ordens com perda no setor ${s.setor.nome}`,
                      lancamentos.filter((l) => l.setorId === s.setor.id && ((l.perdaKg || 0) > 0 || (l.refugoKg || 0) > 0))
                    )
                  }
                  className="p-2 bg-white rounded-lg border border-slate-200/80 hover:border-indigo-400 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{s.setor.nome}</span>
                    <span className="font-bold text-rose-600">{formatPtBrKg(s.metrics.totalPerdaKg)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                    <span>Taxa: <strong className="text-slate-700">{formatPtBrPercent(s.metrics.percentualPerda)}</strong></span>
                    <span>Refugo: {formatPtBrKg(s.metrics.totalRefugoKg)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por Turno */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Perda por Turno</span>
              </div>
              <span className="text-[10px] text-slate-400">Ponderado</span>
            </div>
            <div className="space-y-2">
              {perdasPorTurno.map((t) => (
                <div
                  key={t.turno.id}
                  onClick={() =>
                    abrirAuditoria(
                      `Perdas no ${t.turno.nome}`,
                      `Apontamentos com perda no ${t.turno.nome}`,
                      t.lancamentos.filter((l) => (l.perdaKg || 0) > 0 || (l.refugoKg || 0) > 0)
                    )
                  }
                  className="p-2 bg-white rounded-lg border border-slate-200/80 hover:border-blue-400 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{t.turno.nome}</span>
                    <span className="font-bold text-rose-600">{formatPtBrKg(t.metrics.totalPerdaKg)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                    <span>Taxa: <strong className="text-slate-700">{formatPtBrPercent(t.metrics.percentualPerda)}</strong></span>
                    <span>Prod: {formatPtBrKg(t.metrics.totalLiquidoKg)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 Operadores com Mais Perdas */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <User className="w-4 h-4 text-amber-600" />
                <span>Operadores com Maior Perda</span>
              </div>
              <span className="text-[10px] text-slate-400">Em kg</span>
            </div>
            <div className="space-y-2">
              {[...perdasPorOperador]
                .sort((a, b) => b.metrics.totalPerdaKg - a.metrics.totalPerdaKg)
                .slice(0, 3)
                .map((op) => (
                  <div
                    key={op.operador.id}
                    onClick={() =>
                      abrirAuditoria(
                        `Perdas do Operador: ${op.operador.nome}`,
                        `Todos os lançamentos com descarte deste operador`,
                        lancamentos.filter((l) => l.operadorId === op.operador.id)
                      )
                    }
                    className="p-2 bg-white rounded-lg border border-slate-200/80 hover:border-amber-400 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{op.operador.nome}</span>
                      <span className="font-bold text-rose-600">{formatPtBrKg(op.metrics.totalPerdaKg)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                      <span>Taxa: <strong className="text-slate-700">{formatPtBrPercent(op.metrics.percentualPerda)}</strong></span>
                      <span>Prod: {formatPtBrKg(op.metrics.totalLiquidoKg)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. RANKING DE PERDAS POR MÁQUINA (Item 15) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Máquinas com Maior Perda (Ranking)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Alterne entre ranking em <strong>Kg</strong> (volume total perdido) e <strong>% de Perda</strong> (taxa de rendimento).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setRankingMode('kg')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                rankingMode === 'kg' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Maior Quantidade (kg)
            </button>
            <button
              type="button"
              onClick={() => setRankingMode('percent')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                rankingMode === 'percent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Maior % de Perda
            </button>
          </div>
        </div>

        {/* Nota explicativa requerida */}
        <div className="flex items-start gap-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>Observação Industrial Importante:</strong> Uma máquina com alta produção pode acumular mais quilos de perda absoluta, mas manter um percentual baixo e eficiente. O botão acima permite enxergar claramente ambas as situações.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Pos.</th>
                <th className="py-2.5 px-3">Máquina</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                <th className="py-2.5 px-3 text-right">Perda (kg)</th>
                <th className="py-2.5 px-3 text-right">% Perda</th>
                <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                <th className="py-2.5 px-3 text-right">Ordens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {maquinasRankeadas.map((item, idx) => {
                const maqLancs = lancamentos.filter((l) => l.maquinaId === item.maquina.id);
                return (
                  <tr
                    key={item.maquina.id}
                    onClick={() =>
                      abrirAuditoria(
                        `Máquina: ${item.maquina.codigo} - ${item.maquina.nome}`,
                        `Todos os lançamentos apontados nesta máquina`,
                        maqLancs
                      )
                    }
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.maquina.codigo}</td>
                    <td className="py-3 px-3 text-slate-500">{item.setor?.nome || '—'}</td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-700">
                      {formatPtBrKg(item.metrics.totalLiquidoKg)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      {formatPtBrKg(item.metrics.totalPerdaKg)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          item.metrics.percentualPerda <= 2.5
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {formatPtBrPercent(item.metrics.percentualPerda)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-amber-600 font-medium">
                      {formatPtBrKg(item.metrics.totalRefugoKg)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 whitespace-nowrap">
                      {formatPtBrHoursMin(item.metrics.tempoParadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-600">
                      {item.metrics.totalLancamentos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PRODUTOS COM MAIOR PERDA (Item 16) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Produtos com Maior Perda</h3>
          </div>
          <p className="text-xs text-slate-500">
            Identifica itens que sistematicamente geram maior índice de desperdício em máquina.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                <th className="py-2.5 px-3 text-right">Perda (kg)</th>
                <th className="py-2.5 px-3 text-right">% Perda</th>
                <th className="py-2.5 px-3">Máquinas Utilizadas</th>
                <th className="py-2.5 px-3 text-right">Ordens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {produtosRankeados.map((item) => (
                <tr
                  key={item.produto.id}
                  onClick={() =>
                    abrirAuditoria(
                      `Produto: ${item.produto.descricao}`,
                      `Apontamentos de produção deste produto`,
                      item.lancamentos
                    )
                  }
                  className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-slate-900">{item.produto.descricao}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{item.produto.codigo}</td>
                  <td className="py-3 px-3 text-right font-medium text-emerald-700">
                    {formatPtBrKg(item.metrics.totalLiquidoKg)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-rose-600">
                    {formatPtBrKg(item.metrics.totalPerdaKg)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                        item.metrics.percentualPerda <= 2.5
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {formatPtBrPercent(item.metrics.percentualPerda)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {item.maquinasCodigos.map((cod) => (
                        <span key={cod} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {cod}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-600">{item.lancamentosCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. EVOLUÇÃO TEMPORAL DAS PERDAS (Item 17) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Evolução das Perdas no Tempo</h3>
            </div>
            <p className="text-xs text-slate-500">
              Acompanhamento da curva de perdas agregadas por dia, semana ou mês.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor Métrica: kg ou % */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setEvolucaoMetrica('percent')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  evolucaoMetrica === 'percent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                % de Perda
              </button>
              <button
                type="button"
                onClick={() => setEvolucaoMetrica('kg')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  evolucaoMetrica === 'kg' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Kg de Perda
              </button>
            </div>

            {/* Seletor Escala: Dia, Semana, Mês */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setEvolucaoEscala('dia')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  evolucaoEscala === 'dia' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setEvolucaoEscala('semana')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  evolucaoEscala === 'semana' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setEvolucaoEscala('mes')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  evolucaoEscala === 'mes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Mês
              </button>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras SVG Responsivo */}
        {dadosEvolucao.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Sem dados históricos para a escala selecionada.</div>
        ) : (
          <div className="space-y-2">
            <div className="h-48 flex items-end gap-2 pt-6 border-b border-slate-200">
              {dadosEvolucao.map((item, idx) => {
                const val = evolucaoMetrica === 'kg' ? item.valorKg : item.valorPercent;
                const heightPercent = Math.min(100, Math.max(8, (val / maxEvolucao) * 100));
                const isOverMeta = evolucaoMetrica === 'percent' && item.valorPercent > 2.5;

                return (
                  <div
                    key={idx}
                    onClick={() =>
                      abrirAuditoria(
                        `Perdas do Período (${item.rotulo})`,
                        `${item.lancamentos.length} apontamentos auditados`,
                        item.lancamentos
                      )
                    }
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      {evolucaoMetrica === 'kg' ? formatPtBrKg(val) : formatPtBrPercent(val)}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[40px] rounded-t-lg transition-all group-hover:brightness-95 ${
                        isOverMeta ? 'bg-rose-500' : 'bg-indigo-500'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Eixo X com os Rótulos */}
            <div className="flex items-center gap-2">
              {dadosEvolucao.map((item, idx) => (
                <div key={idx} className="flex-1 text-center text-[10px] font-medium text-slate-500 truncate">
                  {item.rotulo}
                </div>
              ))}
            </div>

            {/* Linha de Referência da Meta */}
            {evolucaoMetrica === 'percent' && (
              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Barras em vermelho indicam dias/períodos acima da meta corporativa de 2,50%</span>
              </div>
            )}
          </div>
        )}
      </div>

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
