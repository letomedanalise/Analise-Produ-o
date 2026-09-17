'use client';

import React, { useState, useMemo } from 'react';
import { LancamentoProducao, Maquina } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  ConsolidatedMetrics,
  formatPtBrKg,
  formatPtBrUn,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
  formatYMDToBR,
  groupLancamentosByMaquina,
  groupLancamentosDiario,
  calculateParadasPorMotivoCompleto,
  consolidateLancamentos,
} from '@/lib/production-analytics';
import {
  Cpu,
  ArrowUpDown,
  TrendingDown,
  Clock,
  Zap,
  ArrowRightLeft,
  X,
  Calendar,
  Layers,
  User,
  Package,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

type SortShortcut =
  | 'maior_producao'
  | 'menor_perda'
  | 'maior_perda'
  | 'maior_produtividade'
  | 'maior_tempo_parado'
  | 'menor_tempo_parado';

interface RelatorioMaquinasProps {
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioMaquinas({ lancamentos, periodoRotulo }: RelatorioMaquinasProps) {
  const { data } = useProductionDB();
  const [sortShortcut, setSortShortcut] = useState<SortShortcut>('maior_producao');
  const [selectedMaquinaParaDetalhe, setSelectedMaquinaParaDetalhe] = useState<string | null>(null);

  // Comparador de máquinas
  const [comparacaoAtiva, setComparacaoAtiva] = useState<boolean>(false);
  const [maquinasComparadas, setMaquinasComparadas] = useState<string[]>([]);

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

  const maquinasList = useMemo(() => {
    return groupLancamentosByMaquina(lancamentos, data.maquinas, data.setores);
  }, [lancamentos, data.maquinas, data.setores]);

  // Ordenação com atalhos industriais
  const sortedMaquinas = useMemo(() => {
    const list = [...maquinasList];
    switch (sortShortcut) {
      case 'maior_producao':
        return list.sort((a, b) => b.metrics.totalLiquidoKg - a.metrics.totalLiquidoKg);
      case 'menor_perda':
        return list.sort((a, b) => a.metrics.percentualPerda - b.metrics.percentualPerda);
      case 'maior_perda':
        return list.sort((a, b) => b.metrics.percentualPerda - a.metrics.percentualPerda);
      case 'maior_produtividade':
        return list.sort((a, b) => b.metrics.produtividadeKgHora - a.metrics.produtividadeKgHora);
      case 'maior_tempo_parado':
        return list.sort((a, b) => b.metrics.tempoParadoMinutos - a.metrics.tempoParadoMinutos);
      case 'menor_tempo_parado':
        return list.sort((a, b) => a.metrics.tempoParadoMinutos - b.metrics.tempoParadoMinutos);
      default:
        return list;
    }
  }, [maquinasList, sortShortcut]);

  // Detalhamento de máquina selecionada
  const maquinaDetalhada = useMemo(() => {
    if (!selectedMaquinaParaDetalhe) return null;
    const item = maquinasList.find((m) => m.maquina.id === selectedMaquinaParaDetalhe);
    if (!item) return null;

    const maqLancs = lancamentos.filter((l) => l.maquinaId === item.maquina.id);
    const dias = groupLancamentosDiario(maqLancs);

    // Produtos fabricados
    const produtosIds = Array.from(new Set(maqLancs.map((l) => l.produtoId)));
    const produtos = produtosIds.map((id) => {
      const p = data.produtos.find((prod) => prod.id === id);
      const pLancs = maqLancs.filter((l) => l.produtoId === id);
      const m = consolidateLancamentos(pLancs);
      return { produto: p, metrics: m, count: pLancs.length };
    });

    // Operadores
    const opsIds = Array.from(new Set(maqLancs.map((l) => l.operadorId)));
    const operadores = opsIds.map((id) => {
      const op = data.operadores.find((o) => o.id === id);
      const opLancs = maqLancs.filter((l) => l.operadorId === id);
      const m = consolidateLancamentos(opLancs);
      return { operador: op, metrics: m, count: opLancs.length };
    });

    // Paradas da máquina
    const paradasMotivos = calculateParadasPorMotivoCompleto(maqLancs, data.motivosParada);

    return {
      maquina: item.maquina,
      setor: item.setor,
      metrics: item.metrics,
      lancamentos: maqLancs,
      dias,
      produtos,
      operadores,
      paradasMotivos,
    };
  }, [selectedMaquinaParaDetalhe, maquinasList, lancamentos, data.produtos, data.operadores, data.motivosParada]);

  // Toggle para o comparador
  const toggleMaquinaComparacao = (id: string) => {
    setMaquinasComparadas((prev) => {
      if (prev.includes(id)) {
        return prev.filter((m) => m !== id);
      }
      return [...prev, id];
    });
  };

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
      {/* Barra de Ações & Atalhos de Ordenação */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Desempenho Geral de Máquinas</h3>
              <p className="text-xs text-slate-500">
                Acompanhe rendimento, paradas e produtividade. Clique numa máquina para ver seu detalhamento completo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setComparacaoAtiva(!comparacaoAtiva);
              if (!comparacaoAtiva && maquinasComparadas.length === 0 && sortedMaquinas.length >= 2) {
                setMaquinasComparadas([sortedMaquinas[0].maquina.id, sortedMaquinas[1].maquina.id]);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              comparacaoAtiva ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{comparacaoAtiva ? 'Fechar Comparador' : 'Comparar Máquinas'}</span>
          </button>
        </div>

        {/* Atalhos rápidos de ordenação requeridos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Ordenar por:</span>
          {(
            [
              { key: 'maior_producao', label: 'Maior Produção' },
              { key: 'menor_perda', label: 'Menor Perda (%)' },
              { key: 'maior_perda', label: 'Maior Perda (%)' },
              { key: 'maior_produtividade', label: 'Maior Produtividade' },
              { key: 'maior_tempo_parado', label: 'Maior Tempo Parado' },
              { key: 'menor_tempo_parado', label: 'Menor Tempo Parado' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortShortcut(opt.key)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                sortShortcut === opt.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tabela de Máquinas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                {comparacaoAtiva && <th className="py-2.5 px-3 text-center">Sel.</th>}
                <th className="py-2.5 px-3">Máquina</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                <th className="py-2.5 px-3 text-right">Unidades (un)</th>
                <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                <th className="py-2.5 px-3 text-right">Perda Total (kg)</th>
                <th className="py-2.5 px-3 text-right">% Perda</th>
                <th className="py-2.5 px-3 text-right">Aproveitamento</th>
                <th className="py-2.5 px-3 text-right">Horas Trab.</th>
                <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                <th className="py-2.5 px-3 text-right">Produtividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedMaquinas.map((item) => {
                const isSelectedForComp = maquinasComparadas.includes(item.maquina.id);
                return (
                  <tr
                    key={item.maquina.id}
                    onClick={() => setSelectedMaquinaParaDetalhe(item.maquina.id)}
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    {comparacaoAtiva && (
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelectedForComp}
                          onChange={() => toggleMaquinaComparacao(item.maquina.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{item.maquina.nome}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{item.setor?.nome || '—'}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-700">
                      {formatPtBrKg(item.metrics.totalLiquidoKg)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {item.metrics.quantidadeUnidades > 0 ? formatPtBrUn(item.metrics.quantidadeUnidades) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-600 font-medium">
                      {formatPtBrKg(item.metrics.totalRefugoKg)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 font-medium">
                      {formatPtBrKg(item.metrics.totalPerdaKg)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatPtBrKg(item.metrics.totalDescarteKg)}
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
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {formatPtBrPercent(item.metrics.percentualAproveitamento)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {formatPtBrHoursMin(item.metrics.tempoTrabalhadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-medium whitespace-nowrap">
                      {formatPtBrHoursMin(item.metrics.tempoParadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                      {formatPtBrNumber(item.metrics.produtividadeKgHora)} kg/h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 23. COMPARADOR DIRETO DE MÁQUINAS SELECIONADAS */}
      {comparacaoAtiva && maquinasComparadas.length >= 2 && (
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Comparação Lado a Lado de Máquinas ({maquinasComparadas.length} selecionadas)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setMaquinasComparadas([])}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Desmarcar Todas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Indicador</th>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <th key={mId} className="py-2.5 px-3 text-right">
                        {maq?.maquina.codigo}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Setor</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-medium text-slate-600">
                        {maq?.setor?.nome || '—'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Produção Boa (kg)</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-black text-emerald-700">
                        {formatPtBrKg(maq?.metrics.totalLiquidoKg || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">% Perda (Ponderado)</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-bold text-rose-700">
                        {formatPtBrPercent(maq?.metrics.percentualPerda || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Refugo (kg)</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-medium text-amber-700">
                        {formatPtBrKg(maq?.metrics.totalRefugoKg || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Aproveitamento (%)</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatPtBrPercent(maq?.metrics.percentualAproveitamento || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Produtividade (kg/h)</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        {formatPtBrNumber(maq?.metrics.produtividadeKgHora || 0)} kg/h
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Tempo Parado</td>
                  {maquinasComparadas.map((mId) => {
                    const maq = maquinasList.find((m) => m.maquina.id === mId);
                    return (
                      <td key={mId} className="py-2.5 px-3 text-right font-medium text-amber-700">
                        {formatPtBrHoursMin(maq?.metrics.tempoParadoMinutos || 0)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. DETALHAMENTO DA MÁQUINA (MODAL COMPLETO) */}
      {maquinaDetalhada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detalhamento da Máquina: {maquinaDetalhada.maquina.codigo} ({maquinaDetalhada.maquina.nome})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Setor: {maquinaDetalhada.setor?.nome} | Período: {periodoRotulo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMaquinaParaDetalhe(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Cards de Métricas Principais da Máquina */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Produção Total:</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatPtBrKg(maquinaDetalhada.metrics.totalLiquidoKg)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">% Perda Ponderado:</span>
                  <span className="text-lg font-black text-rose-600">
                    {formatPtBrPercent(maquinaDetalhada.metrics.percentualPerda)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Tempo Parado:</span>
                  <span className="text-lg font-black text-amber-700">
                    {formatPtBrHoursMin(maquinaDetalhada.metrics.tempoParadoMinutos)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Produtividade:</span>
                  <span className="text-lg font-black text-indigo-700">
                    {formatPtBrNumber(maquinaDetalhada.metrics.produtividadeKgHora)} kg/h
                  </span>
                </div>
              </div>

              {/* Produção e Perda Diária da Máquina */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Histórico Diário de Operação
                  </h4>
                  <span className="text-xs text-slate-500">{maquinaDetalhada.dias.length} dia(s) com apontamentos</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3">Data</th>
                        <th className="py-2 px-3 text-right">Produção Boa (kg)</th>
                        <th className="py-2 px-3 text-right">Perda (kg)</th>
                        <th className="py-2 px-3 text-right">% Perda</th>
                        <th className="py-2 px-3 text-right">Tempo Parado</th>
                        <th className="py-2 px-3 text-right">Produtividade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {maquinaDetalhada.dias.map((d) => (
                        <tr key={d.data} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {d.dataFormatada} ({d.diaSemana})
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {formatPtBrKg(d.metrics.totalLiquidoKg)}
                          </td>
                          <td className="py-2 px-3 text-right text-rose-600 font-medium">
                            {formatPtBrKg(d.metrics.totalPerdaKg)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            {formatPtBrPercent(d.metrics.percentualPerda)}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-700">
                            {formatPtBrHoursMin(d.metrics.tempoParadoMinutos)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-indigo-700">
                            {formatPtBrNumber(d.metrics.produtividadeKgHora)} kg/h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seção 2 Colunas: Produtos e Operadores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Produtos Fabricados */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>Produtos Fabricados na Máquina</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {maquinaDetalhada.produtos.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 block">{p.produto?.descricao || 'Produto'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.produto?.codigo}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">{formatPtBrKg(p.metrics.totalLiquidoKg)}</span>
                          <span className="text-[10px] text-rose-600 font-medium">
                            {formatPtBrPercent(p.metrics.percentualPerda)} perda
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operadores que Rodaram */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Operadores que Operaram a Máquina</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {maquinaDetalhada.operadores.map((op, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 block">{op.operador?.nome || 'Operador'}</span>
                          <span className="text-[10px] text-slate-400">{op.count} ordens</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">{formatPtBrKg(op.metrics.totalLiquidoKg)}</span>
                          <span className="text-[10px] text-indigo-700 font-bold">
                            {formatPtBrNumber(op.metrics.produtividadeKgHora)} kg/h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Principais Motivos de Parada da Máquina */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Principais Motivos de Parada desta Máquina</span>
                </h4>
                {maquinaDetalhada.paradasMotivos.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sem paradas registradas nesta máquina no período.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-2 px-3">Motivo de Parada</th>
                          <th className="py-2 px-3 text-center">Ocorrências</th>
                          <th className="py-2 px-3 text-right">Tempo Total</th>
                          <th className="py-2 px-3 text-right">Tempo Médio</th>
                          <th className="py-2 px-3 text-right">% do Tempo Parado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {maquinaDetalhada.paradasMotivos.map((mot) => (
                          <tr key={mot.motivoId} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">{mot.motivoNome}</td>
                            <td className="py-2 px-3 text-center">{mot.quantidadeOcorrencias}</td>
                            <td className="py-2 px-3 text-right font-bold text-amber-700">
                              {formatPtBrHoursMin(mot.tempoTotalMinutos)}
                            </td>
                            <td className="py-2 px-3 text-right">{Math.round(mot.tempoMedioMinutos)} min</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">
                              {formatPtBrPercent(mot.percentualDoTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() =>
                  abrirAuditoria(
                    `Lançamentos da Máquina: ${maquinaDetalhada.maquina.codigo}`,
                    `Todos os apontamentos no período`,
                    maquinaDetalhada.lancamentos
                  )
                }
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Auditar Todas as Ordens desta Máquina
              </button>
              <button
                type="button"
                onClick={() => setSelectedMaquinaParaDetalhe(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
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
