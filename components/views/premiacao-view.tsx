'use client';

import React, { useState } from 'react';
import { useProductionDB } from '@/lib/db-context';
import { Award, Trophy, Target, ShieldCheck, DollarSign, Settings, CheckCircle2 } from 'lucide-react';

export function PremiacaoView() {
  const { data, updateRegraPremiacao } = useProductionDB();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Calcula ranking de operadores por menor taxa de perda e refugo
  const ranking = data.operadores
    .map((op) => {
      const lancs = data.lancamentosProducao.filter((l) => l.operadorId === op.id);
      const totalBruto = lancs.reduce((acc, l) => acc + l.quantidadeBrutaKg, 0);
      const totalRefugo = lancs.reduce((acc, l) => acc + (l.refugoKg || 0), 0);
      const totalPerda = lancs.reduce((acc, l) => acc + (l.perdaKg || 0), 0);
      const totalDescarte = totalRefugo + totalPerda;
      const totalLiquido = lancs.reduce((acc, l) => acc + l.quantidadeLiquidaKg, 0);
      const perda = totalBruto > 0 ? Number(((totalDescarte / totalBruto) * 100).toFixed(2)) : 0;
      const regra = data.regrasPremiacao.find((r) => r.setorId === op.setorId);
      const meta = regra?.metaPerdaPercentual ?? op.metaPerdaMaximaPercent;
      const elegivel = lancs.length > 0 && perda <= meta;

      return {
        operador: op,
        lancamentos: lancs.length,
        totalBruto,
        totalLiquido,
        totalRefugo,
        totalPerda,
        totalDescarte,
        perda,
        meta,
        elegivel,
        valorPremio: elegivel ? (regra?.valorBasePremio || 400) : 0,
      };
    })
    .filter((r) => r.lancamentos > 0)
    .sort((a, b) => a.perda - b.perda);

  const getSetorName = (id: string) => data.setores.find((s) => s.id === id)?.nome || id;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Programa de Premiação por Menor Perda</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo configurável de incentivo financeiro para operadores que atingirem metas de redução de refugo.
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
          Apuração Mensal Automática
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Regras de premiação atualizadas com sucesso!</span>
        </div>
      )}

      {/* Regras Ativas por Setor */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />
          <span>Parâmetros e Metas de Premiação por Setor</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.setores.map((setor) => {
            const regra = data.regrasPremiacao.find((r) => r.setorId === setor.id) || {
              metaPerdaPercentual: 2.0,
              toleranciaMaximaPercentual: 3.0,
              valorBasePremio: 450,
            };

            return (
              <div key={setor.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{setor.nome}</span>
                  <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700">
                    {setor.codigo}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-0.5">Meta Máxima de Perda (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={regra.metaPerdaPercentual}
                      onBlur={(e) => {
                        updateRegraPremiacao(setor.id, { metaPerdaPercentual: parseFloat(e.target.value) || 2.0 });
                        setSavedSuccess(true);
                        setTimeout(() => setSavedSuccess(false), 2000);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-0.5">Valor do Prêmio Base (R$)</label>
                    <input
                      type="number"
                      step="10"
                      defaultValue={regra.valorBasePremio}
                      onBlur={(e) => {
                        updateRegraPremiacao(setor.id, { valorBasePremio: parseFloat(e.target.value) || 400 });
                        setSavedSuccess(true);
                        setTimeout(() => setSavedSuccess(false), 2000);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela do Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Classificação Provisória dos Operadores (Menor % de Perda)
          </h3>
          <span className="text-xs text-slate-500">Cálculo dinâmico sobre os lançamentos</span>
        </div>

        {ranking.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum operador com lançamentos apontados para cálculo do ranking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-center">Posição</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4 text-right">Produção Boa</th>
                  <th className="py-3 px-4 text-right">Refugo</th>
                  <th className="py-3 px-4 text-center">% Perda</th>
                  <th className="py-3 px-4 text-center">Meta do Setor</th>
                  <th className="py-3 px-4 text-center">Elegibilidade</th>
                  <th className="py-3 px-4 text-right">Prêmio Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((item, index) => (
                  <tr key={item.operador.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs text-white ${
                          index === 0
                            ? 'bg-amber-500 font-black'
                            : index === 1
                            ? 'bg-slate-400 font-bold'
                            : index === 2
                            ? 'bg-amber-700 font-bold'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {index + 1}º
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.operador.nome}</td>
                    <td className="py-3 px-4 text-slate-600">{getSetorName(item.operador.setorId)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{item.totalLiquido} kg</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">{item.totalRefugo} kg</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{item.perda}%</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">≤ {item.meta}%</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.elegivel
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.elegivel ? 'Qualificado' : 'Não Atingiu'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      R$ {item.valorPremio.toFixed(2)}
                    </td>
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
