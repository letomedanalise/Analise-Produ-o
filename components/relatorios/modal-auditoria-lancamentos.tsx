'use client';

import React from 'react';
import { LancamentoProducao } from '@/lib/types';
import { useProductionDB } from '@/lib/db-context';
import {
  formatYMDToBR,
  formatPtBrKg,
  formatPtBrUn,
  formatPtBrPercent,
  formatPtBrHoursMin,
  formatPtBrNumber,
  consolidateLancamentos,
} from '@/lib/production-analytics';
import { X, Search, ShieldCheck, Download } from 'lucide-react';

interface ModalAuditoriaLancamentosProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  lancamentos: LancamentoProducao[];
}

export function ModalAuditoriaLancamentos({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  lancamentos,
}: ModalAuditoriaLancamentosProps) {
  const { data } = useProductionDB();
  const [searchTerm, setSearchTerm] = React.useState('');

  if (!isOpen) return null;

  const mapaMaq = new Map(data.maquinas.map((m) => [m.id, m.codigo]));
  const mapaOps = new Map(data.operadores.map((o) => [o.id, o.nome]));
  const mapaProds = new Map(data.produtos.map((p) => [p.id, p.descricao]));
  const mapaTurnos = new Map(data.turnos.map((t) => [t.id, t.nome]));
  const mapaSetores = new Map(data.setores.map((s) => [s.id, s.nome]));

  const filteredLancamentos = lancamentos.filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const opNome = (mapaOps.get(l.operadorId) || '').toLowerCase();
    const maqCod = (mapaMaq.get(l.maquinaId) || '').toLowerCase();
    const prodDesc = (mapaProds.get(l.produtoId) || '').toLowerCase();
    const turnoNome = (mapaTurnos.get(l.turnoId) || '').toLowerCase();
    const dataBr = formatYMDToBR(l.data).toLowerCase();
    return (
      opNome.includes(term) ||
      maqCod.includes(term) ||
      prodDesc.includes(term) ||
      turnoNome.includes(term) ||
      dataBr.includes(term)
    );
  });

  const consolidados = consolidateLancamentos(lancamentos);

  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Turno',
      'Setor',
      'Máquina',
      'Operador',
      'Produto',
      'Qtd Bruta (kg)',
      'Qtd Líquida (kg)',
      'Refugo (kg)',
      'Perda Setup (kg)',
      '% Perda',
      'Unidades (un)',
      'Tempo Trab (min)',
      'Tempo Parado (min)',
      'Produtividade (kg/h)',
    ];

    const rows = lancamentos.map((l) => [
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
      (l.percentualPerda || 0).toFixed(2).replace('.', ',') + '%',
      l.quantidadeUnidades || 0,
      l.tempoTrabalhadoMinutos || 0,
      l.tempoParadoMinutos || 0,
      (l.produtividadeKgHora || 0).toFixed(2).replace('.', ','),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_lancamentos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
              <p className="text-xs text-slate-500">
                {subtitulo || `${lancamentos.length} lançamento(s) compõem este valor no período`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              title="Exportar estes lançamentos para CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumo da Auditoria */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Total Líquido:</span>
            <span className="font-bold text-slate-900 text-sm">{formatPtBrKg(consolidados.totalLiquidoKg)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Perdas:</span>
            <span className="font-bold text-rose-700 text-sm">{formatPtBrKg(consolidados.totalPerdaKg)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Refugo:</span>
            <span className="font-bold text-amber-700 text-sm">{formatPtBrKg(consolidados.totalRefugoKg)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">% Perda Ponderado:</span>
            <span className="font-bold text-slate-900 text-sm">{formatPtBrPercent(consolidados.percentualPerda)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Tempo Parado:</span>
            <span className="font-bold text-slate-800 text-sm">{formatPtBrHoursMin(consolidados.tempoParadoMinutos)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Produtividade:</span>
            <span className="font-bold text-indigo-700 text-sm">{formatPtBrNumber(consolidados.produtividadeKgHora)} kg/h</span>
          </div>
        </div>

        {/* Busca e Barra de Ferramentas */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por operador, máquina, produto ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <span className="text-xs text-slate-500">
            Mostrando <strong>{filteredLancamentos.length}</strong> de {lancamentos.length} apontamento(s)
          </span>
        </div>

        {/* Tabela dos Lançamentos */}
        <div className="flex-1 overflow-auto p-4">
          {filteredLancamentos.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhum lançamento encontrado para os critérios de busca informados.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Turno</th>
                    <th className="py-2.5 px-3">Máquina</th>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3 text-right">Bruto (kg)</th>
                    <th className="py-2.5 px-3 text-right">Líquido (kg)</th>
                    <th className="py-2.5 px-3 text-right">Perda (kg)</th>
                    <th className="py-2.5 px-3 text-right">% Perda</th>
                    <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                    <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                    <th className="py-2.5 px-3 text-right">Produtividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLancamentos.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {formatYMDToBR(l.data)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                          {mapaTurnos.get(l.turnoId) || l.turnoId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {mapaMaq.get(l.maquinaId) || l.maquinaId}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{mapaOps.get(l.operadorId) || l.operadorId}</td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate" title={mapaProds.get(l.produtoId) || l.produtoId}>
                        {mapaProds.get(l.produtoId) || l.produtoId}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatPtBrNumber(l.quantidadeBrutaKg)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatPtBrNumber(l.quantidadeLiquidaKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-rose-600">
                        {formatPtBrNumber(l.perdaKg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            l.percentualPerda <= 2.5
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {formatPtBrPercent(l.percentualPerda)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-700">{formatPtBrNumber(l.refugoKg)}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {formatPtBrHoursMin(l.tempoParadoMinutos)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                        {formatPtBrNumber(l.produtividadeKgHora)} kg/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Regra matemática: Todos os totais e percentuais exibidos são recalculados de forma consolidada e auditável.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
