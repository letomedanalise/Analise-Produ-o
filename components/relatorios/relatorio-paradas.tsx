'use client';

import React, { useState, useMemo } from 'react';
import { LancamentoProducao, MotivoParada } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  formatPtBrHoursMin,
  formatPtBrPercent,
  formatPtBrNumber,
  formatYMDToBR,
  calculateParadasPorMaquina,
  calculateParadasPorMotivoCompleto,
  ParadaMotivoCompleto,
} from '@/lib/production-analytics';
import {
  Clock,
  AlertOctagon,
  Cpu,
  BarChart3,
  X,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

interface RelatorioParadasProps {
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioParadas({ lancamentos, periodoRotulo }: RelatorioParadasProps) {
  const { data } = useProductionDB();
  const [selectedMotivoId, setSelectedMotivoId] = useState<string | null>(null);

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

  // Paradas por máquina e por motivo
  const paradasPorMaquina = useMemo(() => {
    return calculateParadasPorMaquina(lancamentos, data.maquinas, data.setores);
  }, [lancamentos, data.maquinas, data.setores]);

  const paradasPorMotivo = useMemo(() => {
    return calculateParadasPorMotivoCompleto(lancamentos, data.motivosParada);
  }, [lancamentos, data.motivosParada]);

  // Indicadores consolidados de paradas (Item 18)
  const statsParadas = useMemo(() => {
    const lancsComParada = lancamentos.filter((l) => (l.tempoParadoMinutos || 0) > 0);
    const tempoTotal = lancsComParada.reduce((acc, l) => acc + (l.tempoParadoMinutos || 0), 0);
    const totalOcorrencias = lancsComParada.length;
    const tempoMedio = totalOcorrencias > 0 ? tempoTotal / totalOcorrencias : 0;

    const topMaquina = paradasPorMaquina.length > 0 ? paradasPorMaquina[0] : null;
    const topMotivo = paradasPorMotivo.length > 0 ? paradasPorMotivo[0] : null;

    return {
      tempoTotal,
      totalOcorrencias,
      tempoMedio,
      topMaquina,
      topMotivo,
      lancsComParada,
    };
  }, [lancamentos, paradasPorMaquina, paradasPorMotivo]);

  // Detalhamento do Motivo Selecionado (Item 22)
  const detalheMotivo = useMemo(() => {
    if (!selectedMotivoId) return null;
    const mot = paradasPorMotivo.find((m) => m.motivoId === selectedMotivoId);
    if (!mot) return null;

    const mapaMaq = new Map(data.maquinas.map((m) => [m.id, m.codigo]));
    const mapaOps = new Map(data.operadores.map((o) => [o.id, o.nome]));
    const mapaProds = new Map(data.produtos.map((p) => [p.id, p.descricao]));

    const ocorrencias = mot.lancamentos.map((l) => ({
      data: l.data,
      maquinaCodigo: mapaMaq.get(l.maquinaId) || l.maquinaId,
      operadorNome: mapaOps.get(l.operadorId) || l.operadorId,
      produtoDesc: mapaProds.get(l.produtoId) || l.produtoId,
      duracaoMin: l.tempoParadoMinutos || 0,
      observacoes: l.observacoes || 'Sem observações registradas',
      lancamento: l,
    }));

    return {
      motivo: mot,
      ocorrencias,
    };
  }, [selectedMotivoId, paradasPorMotivo, data.maquinas, data.operadores, data.produtos]);

  const maxTempoMotivo = useMemo(() => {
    if (paradasPorMotivo.length === 0) return 60;
    return Math.max(...paradasPorMotivo.map((m) => m.tempoTotalMinutos)) * 1.1;
  }, [paradasPorMotivo]);

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
      {/* 18. CARDS DE INDICADORES PRINCIPAIS DE PARADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Tempo Total Parado */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Tempo Total Parado no Período',
              'Todos os apontamentos com interrupção de máquina',
              statsParadas.lancsComParada
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tempo Total Parado</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-700">{formatPtBrHoursMin(statsParadas.tempoTotal)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Horas totais de parada</p>
        </div>

        {/* Número de Paradas */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Ocorrências de Parada',
              'Apontamentos que registraram máquina parada',
              statsParadas.lancsComParada
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Ocorrências</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{statsParadas.totalOcorrencias}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Eventos registrados</p>
        </div>

        {/* Tempo Médio por Parada */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tempo Médio / Parada</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{Math.round(statsParadas.tempoMedio)} min</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Duração média por evento</p>
        </div>

        {/* Máquina com Mais Tempo Parado */}
        <div
          onClick={() => {
            if (statsParadas.topMaquina) {
              abrirAuditoria(
                `Paradas da Máquina ${statsParadas.topMaquina.maquina.codigo}`,
                `Lançamentos com interrupção nesta máquina`,
                statsParadas.topMaquina.lancamentos
              );
            }
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Máquina + Parada</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-rose-700 block truncate">
              {statsParadas.topMaquina ? statsParadas.topMaquina.maquina.nome : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {statsParadas.topMaquina ? formatPtBrHoursMin(statsParadas.topMaquina.tempoTotalMinutos) : 'Sem paradas'}
          </p>
        </div>

        {/* Principal Motivo de Parada */}
        <div
          onClick={() => {
            if (statsParadas.topMotivo) {
              setSelectedMotivoId(statsParadas.topMotivo.motivoId);
            }
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Principal Motivo</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-indigo-700 block truncate" title={statsParadas.topMotivo?.motivoNome}>
              {statsParadas.topMotivo ? statsParadas.topMotivo.motivoNome : '—'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {statsParadas.topMotivo ? formatPtBrHoursMin(statsParadas.topMotivo.tempoTotalMinutos) : 'Sem paradas'}
          </p>
        </div>
      </div>

      {/* 21. GRÁFICO DE PARETO DE PARADAS (80/20) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Gráfico de Pareto de Paradas (Curva ABC / 80-20)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Identifica com precisão estatística os poucos motivos críticos responsáveis por 80% do tempo ocioso das máquinas.
            </p>
          </div>
        </div>

        {paradasPorMotivo.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Sem ocorrências de parada no período selecionado.</div>
        ) : (
          <div className="space-y-4">
            {/* Visualização Gráfica do Pareto */}
            <div className="relative h-64 flex items-end gap-3 pt-6 border-b border-slate-200">
              {/* Linha de Referência dos 80% */}
              <div className="absolute left-0 right-0 top-[20%] border-t-2 border-dashed border-rose-400/80 z-10 flex items-center justify-end pr-2 pointer-events-none">
                <span className="text-[10px] font-bold text-rose-600 bg-white px-1.5 py-0.5 rounded shadow-xs">
                  Corte 80% de Pareto
                </span>
              </div>

              {paradasPorMotivo.map((mot) => {
                const barHeight = Math.min(100, Math.max(8, (mot.tempoTotalMinutos / maxTempoMotivo) * 100));
                const isIn80 = mot.percentualAcumulado <= 85;

                return (
                  <div
                    key={mot.motivoId}
                    onClick={() => setSelectedMotivoId(mot.motivoId)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Tooltip com dados */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                      {formatPtBrHoursMin(mot.tempoTotalMinutos)} ({formatPtBrPercent(mot.percentualDoTotal)}) | Acum: {formatPtBrPercent(mot.percentualAcumulado)}
                    </div>

                    {/* Barra */}
                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full max-w-[48px] rounded-t-lg transition-all group-hover:brightness-95 ${
                        isIn80 ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Rótulos do Eixo X */}
            <div className="flex items-center gap-3">
              {paradasPorMotivo.map((mot) => (
                <div
                  key={mot.motivoId}
                  onClick={() => setSelectedMotivoId(mot.motivoId)}
                  className="flex-1 text-center text-[10px] font-bold text-slate-700 truncate cursor-pointer hover:text-indigo-600"
                  title={mot.motivoNome}
                >
                  {mot.motivoNome}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                As barras em <strong>amarelo</strong> representam os motivos que compõem a faixa de <strong>80% do tempo ocioso</strong>. Focar ações corretivas nestes motivos trará o maior retorno operacional.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 19. PARADAS POR MÁQUINA & 20. PRINCIPAIS MOTIVOS (TABELAS LADO A LADO OU STACK) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 19. Tabela de Paradas por Máquina */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Paradas por Máquina</h3>
              <p className="text-xs text-slate-500">Ordenado pela máquina com maior tempo parado.</p>
            </div>
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Máquina</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3 text-center">Eventos</th>
                  <th className="py-2.5 px-3 text-right">Tempo Total</th>
                  <th className="py-2.5 px-3 text-right">Média</th>
                  <th className="py-2.5 px-3 text-right">% do Geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paradasPorMaquina.map((item) => (
                  <tr
                    key={item.maquina.id}
                    onClick={() =>
                      abrirAuditoria(
                        `Paradas na Máquina: ${item.maquina.nome}`,
                        `Todos os apontamentos de interrupção nesta máquina`,
                        item.lancamentos
                      )
                    }
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.maquina.nome}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.setor?.nome || '—'}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{item.numeroParadas}</td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-700 whitespace-nowrap">
                      {formatPtBrHoursMin(item.tempoTotalMinutos)}
                    </td>
                    <td className="py-2.5 px-3 text-right">{Math.round(item.tempoMedioMinutos)} min</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {formatPtBrPercent(item.percentualDoTempoGeral)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 20. Tabela de Principais Motivos de Parada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Motivos de Parada (Ranking)</h3>
              <p className="text-xs text-slate-500">Clique em qualquer motivo para ver todas as ocorrências detalhadas.</p>
            </div>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Motivo</th>
                  <th className="py-2.5 px-3 text-center">Ocorrências</th>
                  <th className="py-2.5 px-3 text-right">Tempo Total</th>
                  <th className="py-2.5 px-3 text-right">Média</th>
                  <th className="py-2.5 px-3 text-right">% do Total</th>
                  <th className="py-2.5 px-3 text-right">% Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paradasPorMotivo.map((mot) => (
                  <tr
                    key={mot.motivoId}
                    onClick={() => setSelectedMotivoId(mot.motivoId)}
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center justify-between">
                      <span>{mot.motivoNome}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {mot.quantidadeOcorrencias}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-700 whitespace-nowrap">
                      {formatPtBrHoursMin(mot.tempoTotalMinutos)}
                    </td>
                    <td className="py-2.5 px-3 text-right">{Math.round(mot.tempoMedioMinutos)} min</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {formatPtBrPercent(mot.percentualDoTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-500">
                      {formatPtBrPercent(mot.percentualAcumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 22. DETALHAMENTO DO MOTIVO DE PARADA (MODAL COMPLETO) */}
      {detalheMotivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ocorrências de Parada: {detalheMotivo.motivo.motivoNome}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {detalheMotivo.ocorrencias.length} apontamento(s) | Tempo Total:{' '}
                    <strong>{formatPtBrHoursMin(detalheMotivo.motivo.tempoTotalMinutos)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMotivoId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabela de Ocorrências com Observações */}
            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Máquina</th>
                      <th className="py-2.5 px-3">Operador</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-right">Duração</th>
                      <th className="py-2.5 px-3">Observações do Chão de Fábrica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {detalheMotivo.ocorrencias.map((oc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {formatYMDToBR(oc.data)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">{oc.maquinaCodigo}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{oc.operadorNome}</td>
                        <td className="py-2.5 px-3 max-w-[160px] truncate" title={oc.produtoDesc}>
                          {oc.produtoDesc}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-700 whitespace-nowrap">
                          {formatPtBrHoursMin(oc.duracaoMin)}
                        </td>
                        <td className="py-2.5 px-3 italic text-slate-600 max-w-[240px] truncate" title={oc.observacoes}>
                          &quot;{oc.observacoes}&quot;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedMotivoId(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors text-xs"
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
