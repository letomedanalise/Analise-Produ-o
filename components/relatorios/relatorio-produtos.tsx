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
  groupLancamentosByProduto,
} from '@/lib/production-analytics';
import { Package, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';
import { ModalAuditoriaLancamentos } from './modal-auditoria-lancamentos';

interface RelatorioProdutosProps {
  lancamentos: LancamentoProducao[];
  periodoRotulo: string;
}

export function RelatorioProdutos({ lancamentos, periodoRotulo }: RelatorioProdutosProps) {
  const { data } = useProductionDB();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApenasCriticos, setFilterApenasCriticos] = useState(false);

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

  const produtosList = useMemo(() => {
    return groupLancamentosByProduto(lancamentos, data.produtos, data.maquinas);
  }, [lancamentos, data.produtos, data.maquinas]);

  const filteredProdutos = useMemo(() => {
    return produtosList.filter((item) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        item.produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.produto.codigo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCritico = !filterApenasCriticos || item.metrics.percentualPerda > 2.5;

      return matchSearch && matchCritico;
    });
  }, [produtosList, searchTerm, filterApenasCriticos]);

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
      {/* 13. RELATÓRIO POR PRODUTO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Desempenho por Produto Fabricado</h3>
            </div>
            <p className="text-xs text-slate-500">
              Avaliação de rendimento de resina, refugo e máquinas alocadas para cada item da carteira industrial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterApenasCriticos(!filterApenasCriticos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                filterApenasCriticos
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Apenas Acima da Meta (&gt; 2,5%)</span>
            </button>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição ou código do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Tabela de Produtos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3 text-right">Produção Boa (kg)</th>
                <th className="py-2.5 px-3 text-right">Unidades (un)</th>
                <th className="py-2.5 px-3 text-right">Refugo (kg)</th>
                <th className="py-2.5 px-3 text-right">Perdas (kg)</th>
                <th className="py-2.5 px-3 text-right">Perda Total (kg)</th>
                <th className="py-2.5 px-3 text-right">% Perda</th>
                <th className="py-2.5 px-3 text-right">Aproveitamento</th>
                <th className="py-2.5 px-3 text-right">Tempo Parado</th>
                <th className="py-2.5 px-3 text-right">Produtividade</th>
                <th className="py-2.5 px-3">Máquinas Utilizadas</th>
                <th className="py-2.5 px-3 text-right">Ordens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProdutos.map((item) => {
                const isCritico = item.metrics.percentualPerda > 2.5;
                return (
                  <tr
                    key={item.produto.id}
                    onClick={() =>
                      abrirAuditoria(
                        `Ordens do Produto: ${item.produto.descricao}`,
                        `Todos os lançamentos deste produto no período`,
                        item.lancamentos
                      )
                    }
                    className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                      isCritico ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900">{item.produto.descricao}</td>
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
                          isCritico ? 'bg-rose-100 text-rose-800 font-black' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {formatPtBrPercent(item.metrics.percentualPerda)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {formatPtBrPercent(item.metrics.percentualAproveitamento)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-medium whitespace-nowrap">
                      {formatPtBrHoursMin(item.metrics.tempoParadoMinutos)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                      {formatPtBrNumber(item.metrics.produtividadeKgHora)} kg/h
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {item.maquinasCodigos.map((cod) => (
                          <span
                            key={cod}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold"
                          >
                            {cod}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-600">{item.lancamentosCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
