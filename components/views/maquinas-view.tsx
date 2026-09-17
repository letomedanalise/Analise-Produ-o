'use client';

import React from 'react';
import { useProductionDB } from '@/lib/db-context';
import { Cpu, Layers, CheckCircle2, Clock, Wrench, Plus, ArrowRight } from 'lucide-react';
import { TabKey } from '@/components/sidebar';

export function MaquinasView({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data } = useProductionDB();

  const getSetorName = (id: string) => data.setores.find((s) => s.id === id)?.nome || 'Sem Setor';

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Módulo de Máquinas e Equipamentos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualização do parque fabril, capacidades nominais, status operacional e histórico de produção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('cadastros')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Gerenciar Cadastro de Máquinas</span>
        </button>
      </div>

      {/* Grid de Cards de Máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.maquinas.map((m) => {
          const lancs = data.lancamentosProducao.filter((l) => l.maquinaId === m.id);
          const totalKg = lancs.reduce((acc, l) => acc + l.quantidadeLiquidaKg, 0);
          const totalRefugo = lancs.reduce((acc, l) => acc + l.refugoKg, 0);

          return (
            <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {m.codigo}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1.5">{m.nome}</h3>
                  <span className="text-xs text-slate-500">{getSetorName(m.setorId)}</span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    m.status === 'operando'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : m.status === 'parada'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {m.status === 'operando' ? 'Operando' : m.status === 'parada' ? 'Parada' : 'Manutenção'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Capacidade Nominal:</span>
                  <strong className="font-mono text-slate-900">{m.capacidadeNominalHora} kg/h</strong>
                </div>
                <div className="flex justify-between">
                  <span>Produção Acumulada:</span>
                  <strong className="font-mono text-indigo-700">{totalKg.toLocaleString('pt-BR')} kg</strong>
                </div>
                <div className="flex justify-between">
                  <span>Refugo Gerado:</span>
                  <strong className="font-mono text-rose-600">{totalRefugo.toLocaleString('pt-BR')} kg</strong>
                </div>
              </div>

              {m.observacoes && (
                <p className="text-[11px] text-slate-500 italic line-clamp-1">{m.observacoes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
