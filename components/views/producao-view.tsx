'use client';

import React, { useState } from 'react';
import { useProductionDB } from '@/lib/db-context';
import { TrendingUp, Filter, Calendar, Layers, Cpu, Search, Plus, Scale } from 'lucide-react';
import { TabKey } from '@/components/sidebar';

export function ProducaoView({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data } = useProductionDB();
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredLancs = data.lancamentosProducao
    .filter((l) => (selectedSetor === 'todos' ? true : l.setorId === selectedSetor))
    .filter((l) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const op = data.operadores.find((o) => o.id === l.operadorId)?.nome.toLowerCase() || '';
      const prod = data.produtos.find((p) => p.id === l.produtoId)?.descricao.toLowerCase() || '';
      const maq = data.maquinas.find((m) => m.id === l.maquinaId)?.codigo.toLowerCase() || '';
      return op.includes(term) || prod.includes(term) || maq.includes(term) || (l.ordemProducao && l.ordemProducao.toLowerCase().includes(term));
    });

  const totalBruto = filteredLancs.reduce((acc, l) => acc + l.quantidadeBrutaKg, 0);
  const totalLiquido = filteredLancs.reduce((acc, l) => acc + l.quantidadeLiquidaKg, 0);
  const totalRefugo = filteredLancs.reduce((acc, l) => acc + l.refugoKg, 0);
  const taxaPerda = totalBruto > 0 ? ((totalRefugo / totalBruto) * 100).toFixed(2) : '0.00';

  const getSetorName = (id: string) => data.setores.find((s) => s.id === id)?.nome || id;
  const getMaquinaName = (id: string) => data.maquinas.find((m) => m.id === id)?.nome || id;
  const getOperadorName = (id: string) => data.operadores.find((op) => op.id === id)?.nome || id;
  const getProdutoName = (id: string) => data.produtos.find((p) => p.id === id)?.descricao || id;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Módulo de Produção Geral</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de volumes brutos, produção líquida boa, produtividade horária e histórico de lotes por setor.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('lancamentos')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Apontamento</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Produção Boa Total</span>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
            {totalLiquido.toLocaleString('pt-BR')} kg
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Peso Bruto Alimentado</span>
          <div className="text-2xl font-mono font-bold text-slate-700 mt-1">
            {totalBruto.toLocaleString('pt-BR')} kg
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Sucata / Refugo Total</span>
          <div className="text-2xl font-mono font-bold text-rose-600 mt-1">
            {totalRefugo.toLocaleString('pt-BR')} kg
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Rendimento / Eficiência</span>
          <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">
            {totalBruto > 0 ? (100 - Number(taxaPerda)).toFixed(1) : 100}%
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por operador, produto, máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Setor:</span>
          <select
            value={selectedSetor}
            onChange={(e) => setSelectedSetor(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-white text-slate-700 font-medium"
          >
            <option value="todos">Todos os Setores</option>
            {data.setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Lançamentos de Produção */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
            Detalhamento das Ordens e Lotes ({filteredLancs.length})
          </h3>
        </div>

        {filteredLancs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum apontamento corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">OP</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">Máquina</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-right">Bruto (kg)</th>
                  <th className="py-3 px-4 text-right">Líquido (kg)</th>
                  <th className="py-3 px-4 text-center">% Perda</th>
                  <th className="py-3 px-4 text-center">Produtiv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLancs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-600">{l.data}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{l.ordemProducao || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                        {getSetorName(l.setorId)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{getMaquinaName(l.maquinaId)}</td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{getOperadorName(l.operadorId)}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate">{getProdutoName(l.produtoId)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{l.quantidadeBrutaKg}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{l.quantidadeLiquidaKg}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${l.percentualPerda <= 2.2 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {l.percentualPerda}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 text-xs">{l.produtividadeKgHora} kg/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
