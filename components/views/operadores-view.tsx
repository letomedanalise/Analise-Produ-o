'use client';

import React from 'react';
import { useProductionDB } from '@/lib/db-context';
import { Users, Plus, Award, Target, CheckCircle, XCircle } from 'lucide-react';
import { TabKey } from '@/components/sidebar';

export function OperadoresView({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data } = useProductionDB();

  const getSetorName = (id: string) => data.setores.find((s) => s.id === id)?.nome || 'Sem Setor';
  const getTurnoName = (id?: string) => data.turnos.find((t) => t.id === id)?.nome || 'Turno Geral';

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Módulo de Operadores da Produção</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão da equipe fabril, turnos alocados, metas de perdas individuais e histórico de desempenho.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('cadastros')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar / Editar Operadores</span>
        </button>
      </div>

      {/* Cards de Operadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.operadores.map((op) => {
          const lancs = data.lancamentosProducao.filter((l) => l.operadorId === op.id);
          const totalLiquido = lancs.reduce((acc, l) => acc + l.quantidadeLiquidaKg, 0);
          const totalBruto = lancs.reduce((acc, l) => acc + l.quantidadeBrutaKg, 0);
          const totalRefugo = lancs.reduce((acc, l) => acc + l.refugoKg, 0);
          const perda = totalBruto > 0 ? ((totalRefugo / totalBruto) * 100).toFixed(2) : '0.00';
          const atingeMeta = Number(perda) <= op.metaPerdaMaximaPercent;

          return (
            <div key={op.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{op.nome}</h3>
                  <span className="text-xs text-slate-500 block">{op.cargo || 'Operador de Produção'}</span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    op.ativo
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {op.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Setor:</span>
                  <strong className="text-slate-800">{getSetorName(op.setorId)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Meta de Perda:</span>
                  <strong className="text-indigo-600 font-mono">≤ {op.metaPerdaMaximaPercent}%</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Perda Atual</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{perda}%</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Produção Boa</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{totalLiquido} kg</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
