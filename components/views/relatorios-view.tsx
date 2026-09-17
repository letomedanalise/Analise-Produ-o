'use client';

import React, { useState, useMemo } from 'react';
import { useProductionDB } from '@/lib/db-context';
import {
  ConsolidatedMetrics,
  consolidateLancamentos,
  formatYMDToBR,
  formatPtBrKg,
  formatPtBrUn,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
} from '@/lib/production-analytics';
import {
  FileBarChart,
  Calendar,
  Filter,
  Download,
  Printer,
  RotateCcw,
  LayoutDashboard,
  Package,
  Cpu,
  Users,
  TrendingDown,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

import { RelatorioExportHeader } from '@/components/relatorios/relatorio-export-header';
import { RelatorioResumoGeral } from '@/components/relatorios/relatorio-resumo-geral';
import { RelatorioProducao } from '@/components/relatorios/relatorio-producao';
import { RelatorioPerdas } from '@/components/relatorios/relatorio-perdas';
import { RelatorioMaquinas } from '@/components/relatorios/relatorio-maquinas';
import { RelatorioOperadores } from '@/components/relatorios/relatorio-operadores';
import { RelatorioProdutos } from '@/components/relatorios/relatorio-produtos';
import { RelatorioParadas } from '@/components/relatorios/relatorio-paradas';

export type RelatorioTab =
  | 'resumo'
  | 'producao'
  | 'perdas'
  | 'maquinas'
  | 'operadores'
  | 'produtos'
  | 'paradas';

export function RelatoriosView() {
  const { data } = useProductionDB();

  // Aba ativa da Central de Relatórios
  const [activeTab, setActiveTab] = useState<RelatorioTab>('resumo');

  // Filtros Gerais
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [setorId, setSetorId] = useState<string>('');
  const [maquinaId, setMaquinaId] = useState<string>('');
  const [operadorId, setOperadorId] = useState<string>('');
  const [produtoId, setProdutoId] = useState<string>('');
  const [turnoId, setTurnoId] = useState<string>('');

  // Atalhos de Período
  const setPeriodoShortcut = (shortcut: 'hoje' | 'esta_semana' | 'este_mes' | 'mes_passado' | 'este_ano') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // Como os dados da fábrica estão em Agosto/2026, permitimos atalhos funcionais considerando o contexto do banco
    if (shortcut === 'este_mes') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
    } else if (shortcut === 'mes_passado') {
      setStartDate('2026-07-01');
      setEndDate('2026-07-31');
    } else if (shortcut === 'este_ano') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    } else if (shortcut === 'esta_semana') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-07');
    } else if (shortcut === 'hoje') {
      setStartDate('2026-08-03');
      setEndDate('2026-08-03');
    }
  };

  const limparFiltros = () => {
    setStartDate('2026-08-01');
    setEndDate('2026-08-31');
    setSetorId('');
    setMaquinaId('');
    setOperadorId('');
    setProdutoId('');
    setTurnoId('');
  };

  // Máquinas e Operadores disponíveis de acordo com o Setor selecionado
  const maquinasFiltradasPorSetor = useMemo(() => {
    if (!setorId) return data.maquinas;
    return data.maquinas.filter((m) => m.setorId === setorId);
  }, [data.maquinas, setorId]);

  const operadoresFiltradosPorSetor = useMemo(() => {
    if (!setorId) return data.operadores;
    return data.operadores.filter((o) => o.setorId === setorId);
  }, [data.operadores, setorId]);

  // Aplicação estrita de todos os filtros combinados aos lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return data.lancamentosProducao.filter((l) => {
      if (startDate && l.data < startDate) return false;
      if (endDate && l.data > endDate) return false;
      if (setorId && l.setorId !== setorId) return false;
      if (maquinaId && l.maquinaId !== maquinaId) return false;
      if (operadorId && l.operadorId !== operadorId) return false;
      if (produtoId && l.produtoId !== produtoId) return false;
      if (turnoId && l.turnoId !== turnoId) return false;
      return true;
    });
  }, [data.lancamentosProducao, startDate, endDate, setorId, maquinaId, operadorId, produtoId, turnoId]);

  // Métricas Consolidadas do Período Filtrado (Regra: soma absolutos, depois percentual)
  const consolidatedMetrics = useMemo(() => {
    return consolidateLancamentos(lancamentosFiltrados);
  }, [lancamentosFiltrados]);

  // Rótulos informativos para cabeçalho
  const periodoRotulo = `${formatYMDToBR(startDate)} até ${formatYMDToBR(endDate)}`;

  const filtrosDescricao = useMemo(() => {
    const partes: string[] = [];
    if (setorId) {
      const s = data.setores.find((item) => item.id === setorId);
      if (s) partes.push(`Setor: ${s.nome}`);
    }
    if (maquinaId) {
      const m = data.maquinas.find((item) => item.id === maquinaId);
      if (m) partes.push(`Máquina: ${m.codigo}`);
    }
    if (operadorId) {
      const o = data.operadores.find((item) => item.id === operadorId);
      if (o) partes.push(`Operador: ${o.nome}`);
    }
    if (produtoId) {
      const p = data.produtos.find((item) => item.id === produtoId);
      if (p) partes.push(`Produto: ${p.descricao}`);
    }
    if (turnoId) {
      const t = data.turnos.find((item) => item.id === turnoId);
      if (t) partes.push(`Turno: ${t.nome}`);
    }
    return partes.length > 0 ? partes.join(' | ') : 'Todos os setores, máquinas e produtos';
  }, [setorId, maquinaId, operadorId, produtoId, turnoId, data]);

  const tituloRelatorio = useMemo(() => {
    switch (activeTab) {
      case 'resumo':
        return 'RESUMO GERAL DE PRODUÇÃO & INDICADORES';
      case 'producao':
        return 'RELATÓRIO DE PRODUÇÃO INDUSTRIAL (DIÁRIO / SEMANAL / MENSAL)';
      case 'perdas':
        return 'ANÁLISE ESTRATÉGICA DE PERDAS E REFUGO';
      case 'maquinas':
        return 'RELATÓRIO DE DESEMPENHO E DISPONIBILIDADE DE MÁQUINAS';
      case 'operadores':
        return 'RELATÓRIO DE EFICIÊNCIA DE OPERADORES';
      case 'produtos':
        return 'RELATÓRIO DE RENDIMENTO POR PRODUTO FABRICADO';
      case 'paradas':
        return 'ANÁLISE DE PARADAS E CURVA DE PARETO 80/20';
      default:
        return 'RELATÓRIO INDUSTRIAL DE PRODUÇÃO';
    }
  }, [activeTab]);

  // Exportação Excel (CSV Estruturado)
  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Turno',
      'Setor',
      'Máquina',
      'Operador',
      'Produto',
      'Matéria-Prima Bruta (kg)',
      'Produção Boa Líquida (kg)',
      'Refugo (kg)',
      'Perda Setup (kg)',
      'Perda Total (kg)',
      '% Perda Ponderado',
      'Unidades (un)',
      'Tempo Produtivo (min)',
      'Tempo Parado (min)',
      'Produtividade (kg/h)',
    ];

    const mapaTurnos = new Map(data.turnos.map((t) => [t.id, t.nome]));
    const mapaSetores = new Map(data.setores.map((s) => [s.id, s.nome]));
    const mapaMaq = new Map(data.maquinas.map((m) => [m.id, m.codigo]));
    const mapaOps = new Map(data.operadores.map((o) => [o.id, o.nome]));
    const mapaProds = new Map(data.produtos.map((p) => [p.id, p.descricao]));

    const rows = lancamentosFiltrados.map((l) => [
      formatYMDToBR(l.data),
      mapaTurnos.get(l.turnoId) || l.turnoId,
      mapaSetores.get(l.setorId) || l.setorId,
      mapaMaq.get(l.maquinaId) || l.maquinaId,
      mapaOps.get(l.operadorId) || l.operadorId,
      `"${mapaProds.get(l.produtoId) || l.produtoId}"`,
      l.quantidadeBrutaKg.toFixed(2).replace('.', ','),
      l.quantidadeLiquidaKg.toFixed(2).replace('.', ','),
      (l.refugoKg || 0).toFixed(2).replace('.', ','),
      (l.perdaKg || 0).toFixed(2).replace('.', ','),
      ((l.perdaKg || 0) + (l.refugoKg || 0)).toFixed(2).replace('.', ','),
      (l.percentualPerda || 0).toFixed(2).replace('.', ',') + '%',
      l.quantidadeUnidades || 0,
      l.tempoTrabalhadoMinutos || 0,
      l.tempoParadoMinutos || 0,
      (l.produtividadeKgHora || 0).toFixed(2).replace('.', ','),
    ]);

    // Metadados no topo do CSV
    const metadataHeader = [
      `"RELATÓRIO DE PRODUÇÃO INDUSTRIAL - ${tituloRelatorio}"`,
      `"Período Analisado: ${periodoRotulo}"`,
      `"Filtros: ${filtrosDescricao}"`,
      `"Data de Geração: ${new Date().toLocaleString('pt-BR')}"`,
      `"Total Produção Boa (kg): ${consolidatedMetrics.totalLiquidoKg.toFixed(2).replace('.', ',')}"`,
      `"Total Perda (kg): ${consolidatedMetrics.totalPerdaKg.toFixed(2).replace('.', ',')}"`,
      `"% Perda Ponderado: ${consolidatedMetrics.percentualPerda.toFixed(2).replace('.', ',')}%"`,
      '',
    ];

    const csvContent =
      '\uFEFF' +
      metadataHeader.join('\r\n') +
      '\r\n' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. CENTRAL DE RELATÓRIOS - CARDS SUPERIORES DE NAVEGAÇÃO */}
      <div className="print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Central de Relatórios Gerenciais</h2>
            </div>
            <p className="text-xs text-slate-500">
              Módulo unificado de auditoria, análise de produtividade, perdas e paradas de máquina.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              title="Exportar dados filtrados para planilha Excel (CSV formatado)"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              title="Gerar PDF ou Imprimir Relatório Oficial"
            >
              <Printer className="w-4 h-4" />
              <span>Exportar PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Grade de Seleção dos 7 Módulos de Relatório */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {[
            { id: 'resumo', label: 'Resumo Geral', icon: LayoutDashboard, desc: 'Balanço Geral' },
            { id: 'producao', label: 'Produção', icon: Layers, desc: 'Diário / Sem / Mês' },
            { id: 'perdas', label: 'Perdas & Refugo', icon: TrendingDown, desc: 'Onde perdemos' },
            { id: 'maquinas', label: 'Máquinas', icon: Cpu, desc: 'Desempenho & Comp.' },
            { id: 'operadores', label: 'Operadores', icon: Users, desc: 'Eficiência Operacional' },
            { id: 'produtos', label: 'Produtos', icon: Package, desc: 'Rendimento Itens' },
            { id: 'paradas', label: 'Paradas', icon: Clock, desc: 'Pareto 80/20' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as RelatorioTab)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                </div>
                <div className="font-bold text-xs leading-tight">{tab.label}</div>
                <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {tab.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FILTROS GERAIS UNIFICADOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filtros da Produção</h3>
          </div>

          {/* Atalhos Rápidos de Período */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Atalhos:</span>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'esta_semana', label: 'Esta Semana' },
              { id: 'este_mes', label: 'Este Mês (Agosto)' },
              { id: 'mes_passado', label: 'Mês Passado' },
              { id: 'este_ano', label: 'Ano 2026' },
            ].map((at) => (
              <button
                key={at.id}
                type="button"
                onClick={() => setPeriodoShortcut(at.id as any)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                {at.label}
              </button>
            ))}
            <button
              type="button"
              onClick={limparFiltros}
              className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Linha com os Controles de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {/* Data Inicial */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Inicial:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Final:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Setor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Setor:</label>
            <select
              value={setorId}
              onChange={(e) => {
                setSetorId(e.target.value);
                setMaquinaId('');
                setOperadorId('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Setores</option>
              {data.setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Máquina */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Máquina:</label>
            <select
              value={maquinaId}
              onChange={(e) => setMaquinaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as Máquinas</option>
              {maquinasFiltradasPorSetor.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Operador */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Operador:</label>
            <select
              value={operadorId}
              onChange={(e) => setOperadorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Operadores</option>
              {operadoresFiltradosPorSetor.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Produto */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Produto:</label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Produtos</option>
              {data.produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descricao}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumo do filtro ativo */}
        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span>
            Lançamentos encontrados: <strong>{lancamentosFiltrados.length}</strong> ordem(ns) de produção
          </span>
          <span className="font-semibold text-slate-700">Período: {periodoRotulo}</span>
        </div>
      </div>

      {/* CABEÇALHO INSTITUCIONAL DE IMPRESSÃO / EXPORTAÇÃO */}
      <RelatorioExportHeader
        tituloRelatorio={tituloRelatorio}
        periodoRotulo={periodoRotulo}
        filtrosDescricao={filtrosDescricao}
      />

      {/* RENDERIZAÇÃO DO MÓDULO SELECIONADO */}
      {activeTab === 'resumo' && (
        <RelatorioResumoGeral
          metrics={consolidatedMetrics}
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}

      {activeTab === 'producao' && (
        <RelatorioProducao
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}

      {activeTab === 'perdas' && (
        <RelatorioPerdas
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}

      {activeTab === 'maquinas' && (
        <RelatorioMaquinas
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}

      {activeTab === 'operadores' && (
        <RelatorioOperadores
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}

      {activeTab === 'produtos' && (
        <RelatorioProdutos
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}

      {activeTab === 'paradas' && (
        <RelatorioParadas
          lancamentos={lancamentosFiltrados}
          periodoRotulo={periodoRotulo}
        />
      )}
    </div>
  );
}
