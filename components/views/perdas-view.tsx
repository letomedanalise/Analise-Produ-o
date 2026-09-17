'use client';

import React from 'react';
import { useProductionDB } from '@/lib/db-context';
import { AlertTriangle, TrendingDown, Target, ShieldAlert, Award } from 'lucide-react';
import { TabKey } from '@/components/sidebar';

export function PerdasView({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data } = useProductionDB();

  const totalBruto = data.lancamentosProducao.reduce((acc, l) => acc + l.quantidadeBrutaKg, 0);
  const totalRefugo = data.lancamentosProducao.reduce((acc, l) => acc + (l.refugoKg || 0), 0);
  const totalPerda = data.lancamentosProducao.reduce((acc, l) => acc + (l.perdaKg || 0), 0);
  const totalDescarte = totalRefugo + totalPerda;
  const percentualPerdaGeral = totalBruto > 0 ? ((totalDescarte / totalBruto) * 100).toFixed(2) : '0.00';
  const metaGeral = data.configuracoes.metaGeralPerda || 2.5;

  const perdasPorSetor = data.setores.map((setor) => {
    const lancs = data.lancamentosProducao.filter((l) => l.setorId === setor.id);
    const bruto = lancs.reduce((acc, l) => acc + l.quantidadeBrutaKg, 0);
    const refugo = lancs.reduce((acc, l) => acc + (l.refugoKg || 0), 0);
    const perda = lancs.reduce((acc, l) => acc + (l.perdaKg || 0), 0);
    const descarte = refugo + perda;
    const taxa = bruto > 0 ? ((descarte / bruto) * 100).toFixed(2) : '0.00';
    return {
      setor,
      bruto,
      refugo,
      perda,
      descarte,
      taxa: Number(taxa),
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900">Módulo de Perdas e Refugos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoramento de aparas, borras, perdas de processo e refugos de acerto com medições independentes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('premiacao')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Award className="w-4 h-4" />
          <span>Programa de Premiação por Menor Perda</span>
        </button>
      </div>

      {/* Indicadores de Perda e Refugo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Índice Geral de Descarte</span>
          <div className="text-3xl font-black font-mono text-slate-900 mt-1">
            {percentualPerdaGeral}%
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Meta da fábrica: <strong className="text-indigo-600 font-mono">≤ {metaGeral}%</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-rose-600 font-semibold">Refugo de Processo</span>
          <div className="text-3xl font-black font-mono text-rose-600 mt-1">
            {totalRefugo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Aparas, borras e sucatas
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-amber-700 font-semibold">Perdas de Setup / Acerto</span>
          <div className="text-3xl font-black font-mono text-amber-600 mt-1">
            {totalPerda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Acerto térmico, regulagem e testes
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Status da Meta</span>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                Number(percentualPerdaGeral) <= metaGeral
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              {Number(percentualPerdaGeral) <= metaGeral ? 'Meta Atingida' : 'Atenção: Acima'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Total: {totalDescarte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
          </div>
        </div>
      </div>

      {/* Perdas por Setor Produtivo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Perdas e Refugos por Setor Produtivo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {perdasPorSetor.map((item) => (
            <div key={item.setor.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{item.setor.nome}</span>
                <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  {item.taxa}% descarte
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1 pt-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Refugo:</span>
                  <strong className="text-rose-600">{item.refugo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Perda:</span>
                  <strong className="text-amber-600">{item.perda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-1">
                  <span className="text-slate-500 font-sans">Alimentado:</span>
                  <strong className="text-slate-800">{item.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
