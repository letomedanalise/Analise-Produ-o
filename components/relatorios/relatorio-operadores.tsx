'use client';

import React, { useState, useMemo } from 'react';
import { LancamentoProducao, Operador } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  ConsolidatedMetrics,
  formatPtBrKg,
  formatPtBrUn,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
  formatYMDToBR,
  groupLancamentosByOperador,
  groupLancamentosDiario,
  consolidateLancamentos,
} from '@/lib/production-analytics';
import {
  User,
  Users,
  ArrowRightLeft,
  X,
  Calendar,
  Layers,
  Cpu,
  Package,
  Clock,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

interface RelatorioOperadoresProps {
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioOperadores({ lancamentos, periodoRotulo }: RelatorioOperadoresProps) {
  const { data } = useProductionDB();
  const [selectedOperadorId, setSelectedOperadorId] = useState<string | null>(null);

  // Comparador de operadores
  const [comparadorAtivo, setComparadorAtivo] = useState<boolean>(false);
  const [operadoresComparados, setOperadoresComparados] = useState<string[]>([]);

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

  const operadoresList = useMemo(() => {
    return groupLancamentosByOperador(lancamentos, data.operadores, data.setores);
  }, [lancamentos, data.operadores, data.setores]);

  // Detalhamento do operador selecionado
  const operadorDetalhado = useMemo(() => {
    if (!selectedOperadorId) return null;
    const item = operadoresList.find((op) => op.operador.id === selectedOperadorId);
    if (!item) return null;

    const opLancs = lancamentos.filter((l) => l.operadorId === item.operador.id);
    const dias = groupLancamentosDiario(opLancs);

    // Máquinas utilizadas
    const maquinasIds = Array.from(new Set(opLancs.map((l) => l.maquinaId)));
    const maquinas = maquinasIds.map((id) => {
      const maq = data.maquinas.find((m) => m.id === id);
      const mLancs = opLancs.filter((l) => l.maquinaId === id);
      const m = consolidateLancamentos(mLancs);
      return { maquina: maq, metrics: m, count: mLancs.length };
    });

    // Produtos produzidos
    const produtosIds = Array.from(new Set(opLancs.map((l) => l.produtoId)));
    const produtos = produtosIds.map((id) => {
      const prod = data.produtos.find((p) => p.id === id);
      const pLancs = opLancs.filter((l) => l.produtoId === id);
      const m = consolidateLancamentos(pLancs);
      return { produto: prod, metrics: m, count: pLancs.length };
    });

    return {
      operador: item.operador,
      setor: item.setor,
      metrics: item.metrics,
      diasTrabalhados: dias.length,
      lancamentos: opLancs,
      dias,
      maquinas,
      produtos,
    };
  }, [selectedOperadorId, operadoresList, lancamentos, data.maquinas, data.produtos]);

  const toggleOperadorComparacao = (id: string) => {
    setOperadoresComparados((prev) => {
      if (prev.includes(id)) return prev.filter((o) => o !== id);
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
      {/* 11. TABELA PRINCIPAL DE OPERADORES */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Desempenho Geral de Operadores</h3>
            </div>
            <p className="text-xs text-slate-500">
              Acompanhamento industrial de volume produzido, índices de perda e produtividade por colaborador.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setComparadorAtivo(!comparadorAtivo);
              if (!comparadorAtivo && operadoresComparados.length === 0 && operadoresList.length >= 2) {
                setOperadoresComparados([operadoresList[0].operador.id, operadoresList[1].operador.id]);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              comparadorAtivo ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{comparadorAtivo ? 'Fechar Comparador' : 'Comparar Operadores'}</span>
          </button>
        </div>

        {/* Aviso institucional obrigatório */}
        <div className="flex items-start gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <span>
            <strong>Aviso de Governança Industrial:</strong> Este relatório é de estrito acompanhamento gerencial da produção e não substitui, altera ou antecipa as regras de cálculo e fechamento do módulo oficial de <strong>Premiação</strong> da empresa.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                {comparadorAtivo && <th className="py-2.5 px-3 text-center">Sel.</th>}
                <th className="py-2.5 px-3">Operador</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                <th className="py-2.5 px-3 text-right">Unidades (un)</th>
                <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                <th className="py-2.5 px-3 text-right">Perda Total (kg)</th>
                <th className="py-2.5 px-3 text-right">% Perda</th>
                <th className="py-2.5 px-3 text-right">Horas Trab.</th>
                <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                <th className="py-2.5 px-3 text-right">Produtividade</th>
                <th className="py-2.5 px-3 text-right">Ordens</th>
                <th className="py-2.5 px-3 text-right">Dias Trab.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {operadoresList.map((item) => {
                const isSelected = operadoresComparados.includes(item.operador.id);
                return (
                  <tr
                    key={item.operador.id}
                    onClick={() => setSelectedOperadorId(item.operador.id)}
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    {comparadorAtivo && (
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOperadorComparacao(item.operador.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{item.operador.nome}</span>
                      <span className="text-[10px] text-slate-400">Matrícula: {item.operador.matricula || '—'}</span>
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
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {formatPtBrHoursMin(item.metrics.tempoTrabalhadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-medium whitespace-nowrap">
                      {formatPtBrHoursMin(item.metrics.tempoParadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                      {formatPtBrNumber(item.metrics.produtividadeKgHora)} kg/h
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-600">
                      {item.metrics.totalLancamentos}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">{item.diasTrabalhados}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 24. COMPARADOR DIRETO DE OPERADORES */}
      {comparadorAtivo && operadoresComparados.length >= 2 && (
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Comparação Lado a Lado de Operadores ({operadoresComparados.length} selecionados)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOperadoresComparados([])}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Desmarcar Todos
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Indicador</th>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <th key={opId} className="py-2.5 px-3 text-right">
                        {op?.operador.nome}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Setor</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-medium text-slate-600">
                        {op?.setor?.nome || '—'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Produção Boa (kg)</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-black text-emerald-700">
                        {formatPtBrKg(op?.metrics.totalLiquidoKg || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">% Perda (Ponderado)</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-bold text-rose-700">
                        {formatPtBrPercent(op?.metrics.percentualPerda || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Refugo (kg)</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-medium text-amber-700">
                        {formatPtBrKg(op?.metrics.totalRefugoKg || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Produtividade (kg/h)</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        {formatPtBrNumber(op?.metrics.produtividadeKgHora || 0)} kg/h
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Horas Trabalhadas</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-medium">
                        {formatPtBrHoursMin(op?.metrics.tempoTrabalhadoMinutos || 0)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Tempo Parado</td>
                  {operadoresComparados.map((opId) => {
                    const op = operadoresList.find((o) => o.operador.id === opId);
                    return (
                      <td key={opId} className="py-2.5 px-3 text-right font-medium text-amber-700">
                        {formatPtBrHoursMin(op?.metrics.tempoParadoMinutos || 0)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 12. DETALHAMENTO DO OPERADOR (MODAL COMPLETO) */}
      {operadorDetalhado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detalhamento do Colaborador: {operadorDetalhado.operador.nome}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Setor: {operadorDetalhado.setor?.nome} | Período: {periodoRotulo} | {operadorDetalhado.diasTrabalhados} dias trabalhados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOperadorId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Produção Boa Total:</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatPtBrKg(operadorDetalhado.metrics.totalLiquidoKg)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">% Perda Ponderado:</span>
                  <span className="text-lg font-black text-rose-600">
                    {formatPtBrPercent(operadorDetalhado.metrics.percentualPerda)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Horas Trabalhadas:</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatPtBrHoursMin(operadorDetalhado.metrics.tempoTrabalhadoMinutos)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Produtividade Média:</span>
                  <span className="text-lg font-black text-indigo-700">
                    {formatPtBrNumber(operadorDetalhado.metrics.produtividadeKgHora)} kg/h
                  </span>
                </div>
              </div>

              {/* Histórico Diário do Operador */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Histórico Diário de Turnos
                  </h4>
                  <span className="text-xs text-slate-500">{operadorDetalhado.dias.length} dia(s) com apontamento</span>
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
                      {operadorDetalhado.dias.map((d) => (
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

              {/* Seção 2 Colunas: Máquinas e Produtos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Máquinas Operadas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>Máquinas Operadas pelo Colaborador</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {operadorDetalhado.maquinas.map((m, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 block">{m.maquina?.codigo} - {m.maquina?.nome}</span>
                          <span className="text-[10px] text-slate-400">{m.count} apontamentos</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">{formatPtBrKg(m.metrics.totalLiquidoKg)}</span>
                          <span className="text-[10px] text-indigo-700 font-bold">
                            {formatPtBrNumber(m.metrics.produtividadeKgHora)} kg/h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Produtos Fabricados */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Produtos Produzidos</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {operadorDetalhado.produtos.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 block">{p.produto?.descricao}</span>
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
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() =>
                  abrirAuditoria(
                    `Lançamentos do Operador: ${operadorDetalhado.operador.nome}`,
                    `Todos os apontamentos no período`,
                    operadorDetalhado.lancamentos
                  )
                }
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Auditar Todos os Lançamentos deste Operador
              </button>
              <button
                type="button"
                onClick={() => setSelectedOperadorId(null)}
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
