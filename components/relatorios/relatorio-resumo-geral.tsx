'use client';

import React, { useState } from 'react';
import { LancamentoProducao } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  ConsolidatedMetrics,
  formatPtBrKg,
  formatPtBrUn,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
  groupLancamentosBySetor,
} from '@/lib/production-analytics';
import {
  Package,
  Cpu,
  TrendingDown,
  Clock,
  Zap,
  Layers,
  Scale,
  CalendarDays,
  FileCheck,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

interface RelatorioResumoGeralProps {
  metrics: ConsolidatedMetrics;
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioResumoGeral({
  metrics,
  lancamentos,
  periodoRotulo,
}: RelatorioResumoGeralProps) {
  const { data } = useProductionDB();
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

  // Dias com produção (datas únicas)
  const datasUnicas = new Set(lancamentos.map((l) => l.data));
  const diasComProducao = datasUnicas.size;

  // Breakdown por setor
  const setoresConsolidados = groupLancamentosBySetor(lancamentos, data.setores);

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
      {/* Grade de 14 Indicadores Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Produção Líquida Boa */}
        <div
          onClick={() => abrirAuditoria('Produção Total Boa (kg)', 'Lançamentos filtrados do período', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Produção Total Líquida</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatPtBrKg(metrics.totalLiquidoKg)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Material acabado conforme</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Produção Total em Unidades */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Produção Total em Unidades',
              'Lançamentos de peças e sacos em Corte e Solda',
              lancamentos.filter((l) => (l.quantidadeUnidades || 0) > 0)
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Produção em Unidades (C&S)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{formatPtBrUn(metrics.quantidadeUnidades)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Sacos e embalagens soldadas</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Matéria-prima Utilizada */}
        <div
          onClick={() => abrirAuditoria('Matéria-Prima Utilizada (Bruto)', 'Total de peso alimentado nas máquinas', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Matéria-Prima Utilizada (Bruto)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{formatPtBrKg(metrics.totalBrutoKg)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Volume total processado</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Aproveitamento Material % */}
        <div
          onClick={() => abrirAuditoria('Rendimento / Aproveitamento %', 'Ponderado sobre a matéria-prima bruta', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Aproveitamento de Material</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700">{formatPtBrPercent(metrics.percentualAproveitamento)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Rendimento global da resina</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Perdas kg */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Perdas de Setup e Processo (kg)',
              'Aparas de acerto e ajuste de máquina',
              lancamentos.filter((l) => (l.perdaKg || 0) > 0)
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Perdas Setup/Processo (kg)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-600">{formatPtBrKg(metrics.totalPerdaKg)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Descarte de ajuste e refile</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Refugo kg */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Refugo / Sucata (kg)',
              'Bobinas defeituosas ou material não aproveitável',
              lancamentos.filter((l) => (l.refugoKg || 0) > 0)
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Refugo / Sucata (kg)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-600">{formatPtBrKg(metrics.totalRefugoKg)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Material para moagem/reciclagem</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Perda Total (Perdas + Refugo) */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Perda Total Descarte (kg)',
              'Somatório de perdas de setup + refugos',
              lancamentos.filter((l) => (l.perdaKg || 0) > 0 || (l.refugoKg || 0) > 0)
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Perda Total (Perda + Refugo)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{formatPtBrKg(metrics.totalDescarteKg)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Descarte total de resina</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* % Perda e % Refugo */}
        <div
          onClick={() => abrirAuditoria('% Perda e % Refugo Ponderado', 'Valores calculados sobre o total bruto', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taxas Consolidadas (%)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-xl font-black text-rose-600">{formatPtBrPercent(metrics.percentualPerda)}</span>
              <span className="text-[10px] text-slate-400 block">Taxa Perda</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-xl font-black text-amber-600">{formatPtBrPercent(metrics.percentualRefugo)}</span>
              <span className="text-[10px] text-slate-400 block">Taxa Refugo</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Meta corporativa: 2,50%</p>
        </div>

        {/* Horas Trabalhadas */}
        <div
          onClick={() => abrirAuditoria('Horas Produtivas de Máquina', 'Tempo em produção apontado nas ordens', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Horas Trabalhadas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{formatPtBrHoursMin(metrics.tempoTrabalhadoMinutos)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{formatPtBrNumber(metrics.horasProdutivas)} horas decimais</p>
        </div>

        {/* Tempo Parado */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Tempo Parado de Máquinas',
              'Apontamentos de interrupções operacionais e manutenções',
              lancamentos.filter((l) => (l.tempoParadoMinutos || 0) > 0)
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tempo Parado Total</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-700">{formatPtBrHoursMin(metrics.tempoParadoMinutos)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Horas perdidas em paradas</p>
        </div>

        {/* Produtividade kg/h */}
        <div
          onClick={() => abrirAuditoria('Produtividade Média (kg/h)', 'Produção líquida dividida por horas produtivas', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Produtividade (kg/h)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-700">
              {formatPtBrNumber(metrics.produtividadeKgHora)} <span className="text-sm font-bold text-slate-500">kg/h</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Velocidade operacional média</p>
        </div>

        {/* Produtividade un/h */}
        <div
          onClick={() =>
            abrirAuditoria(
              'Produtividade em Unidades (un/h)',
              'Unidades por hora produtiva em Corte e Solda',
              lancamentos.filter((l) => l.setorId === 'set-cs')
            )
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Produtividade (un/h)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-700">
              {Math.round(metrics.produtividadeUnidadesHora).toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-bold text-slate-500">un/h</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Média do setor de Corte e Solda</p>
        </div>

        {/* Número de Lançamentos */}
        <div
          onClick={() => abrirAuditoria('Todos os Lançamentos do Período', 'Lote completo de ordens apontadas', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Número de Lançamentos</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalLancamentos}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ordens de produção no período</p>
        </div>

        {/* Dias com Produção */}
        <div
          onClick={() => abrirAuditoria('Dias com Apontamento Ativo', 'Calendário de produção no período', lancamentos)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dias com Produção</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{diasComProducao}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Dias trabalhados no período</p>
        </div>
      </div>

      {/* Resumo por Setor Integrado */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Balanço Consolidado por Setor Industrial</h3>
          </div>
          <span className="text-xs text-slate-500">
            Clique em qualquer setor para auditar os lançamentos específicos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                <th className="py-2.5 px-3 text-right">Unidades (un)</th>
                <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                <th className="py-2.5 px-3 text-right">% Perda</th>
                <th className="py-2.5 px-3 text-right">Aproveitamento</th>
                <th className="py-2.5 px-3 text-right">Horas Trabalhadas</th>
                <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                <th className="py-2.5 px-3 text-right">Produtividade</th>
                <th className="py-2.5 px-3 text-right">Lançamentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {setoresConsolidados.map((item) => {
                const setorLancs = lancamentos.filter((l) => l.setorId === item.setor.id);
                return (
                  <tr
                    key={item.setor.id}
                    onClick={() =>
                      abrirAuditoria(
                        `Setor: ${item.setor.nome}`,
                        `Todos os apontamentos de ${item.setor.nome} no período`,
                        setorLancs
                      )
                    }
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      <span>{item.setor.nome}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatPtBrKg(item.metrics.totalLiquidoKg)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {item.metrics.quantidadeUnidades > 0 ? formatPtBrUn(item.metrics.quantidadeUnidades) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 font-medium">
                      {formatPtBrKg(item.metrics.totalPerdaKg)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-600 font-medium">
                      {formatPtBrKg(item.metrics.totalRefugoKg)}
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
                    <td className="py-3 px-3 text-right font-medium">
                      {formatPtBrHoursMin(item.metrics.tempoTrabalhadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-amber-700">
                      {formatPtBrHoursMin(item.metrics.tempoParadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-700">
                      {formatPtBrNumber(item.metrics.produtividadeKgHora)} kg/h
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-600">
                      {item.metrics.totalLancamentos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-3">TOTAL CONSOLIDADO</td>
                <td className="py-3 px-3 text-right text-emerald-800">{formatPtBrKg(metrics.totalLiquidoKg)}</td>
                <td className="py-3 px-3 text-right">
                  {metrics.quantidadeUnidades > 0 ? formatPtBrUn(metrics.quantidadeUnidades) : '—'}
                </td>
                <td className="py-3 px-3 text-right text-rose-700">{formatPtBrKg(metrics.totalPerdaKg)}</td>
                <td className="py-3 px-3 text-right text-amber-700">{formatPtBrKg(metrics.totalRefugoKg)}</td>
                <td className="py-3 px-3 text-right text-rose-700">{formatPtBrPercent(metrics.percentualPerda)}</td>
                <td className="py-3 px-3 text-right text-emerald-800">
                  {formatPtBrPercent(metrics.percentualAproveitamento)}
                </td>
                <td className="py-3 px-3 text-right">{formatPtBrHoursMin(metrics.tempoTrabalhadoMinutos)}</td>
                <td className="py-3 px-3 text-right text-amber-700">
                  {formatPtBrHoursMin(metrics.tempoParadoMinutos)}
                </td>
                <td className="py-3 px-3 text-right text-indigo-800">
                  {formatPtBrNumber(metrics.produtividadeKgHora)} kg/h
                </td>
                <td className="py-3 px-3 text-right">{metrics.totalLancamentos}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal de Auditoria do Número */}
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
