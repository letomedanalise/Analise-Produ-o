'use client';

import React from 'react';
import { useProductionDB } from '@/lib/db-context';
import { Clock, AlertCircle, Plus, Cpu, User, Wrench } from 'lucide-react';
import { TabKey } from '@/components/sidebar';

export function ParadasView({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data } = useProductionDB();

  const totalMinutos = data.lancamentosParada.reduce((acc, p) => acc + p.tempoMinutos, 0);
  const totalHoras = (totalMinutos / 60).toFixed(1);

  // Agrupamento por motivo de parada
  const minutosPorMotivo = data.motivosParada.map((motivo) => {
    const paradas = data.lancamentosParada.filter((p) => p.motivoParadaId === motivo.id);
    const somaMin = paradas.reduce((acc, p) => acc + p.tempoMinutos, 0);
    return {
      motivo,
      count: paradas.length,
      minutos: somaMin,
      percent: totalMinutos > 0 ? ((somaMin / totalMinutos) * 100).toFixed(1) : '0.0',
    };
  }).filter((m) => m.minutos > 0).sort((a, b) => b.minutos - a.minutos);

  const getMaquinaName = (id: string) => data.maquinas.find((m) => m.id === id)?.nome || id;
  const getOperadorName = (id: string) => data.operadores.find((op) => op.id === id)?.nome || id;
  const getMotivoDesc = (id: string) => data.motivosParada.find((m) => m.id === id)?.descricao || id;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Módulo de Paradas de Máquinas</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle do tempo de inatividade, motivos de setup, quebras e gargalos de produção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('lancamentos')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apontar Parada</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Tempo Total Parado</span>
          <div className="text-3xl font-black font-mono text-slate-900 mt-1">
            {totalMinutos} <span className="text-sm font-semibold text-slate-500">min</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Equivale a {totalHoras} horas de máquina parada
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Ocorrências Registradas</span>
          <div className="text-3xl font-black font-mono text-slate-900 mt-1">
            {data.lancamentosParada.length}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Eventos de parada apontados
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Principal Gargalo</span>
          <div className="text-base font-bold text-indigo-700 mt-2 line-clamp-1">
            {minutosPorMotivo[0]?.motivo.descricao || 'Nenhum'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {minutosPorMotivo[0] ? `${minutosPorMotivo[0].minutos} min (${minutosPorMotivo[0].percent}%)` : '-'}
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
            Histórico de Ocorrências de Paradas
          </h3>
        </div>

        {data.lancamentosParada.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhuma parada de máquina registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Máquina</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Motivo da Parada</th>
                  <th className="py-3 px-4 text-center">Duração</th>
                  <th className="py-3 px-4">Horários</th>
                  <th className="py-3 px-4">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lancamentosParada.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-600">{p.data}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{getMaquinaName(p.maquinaId)}</td>
                    <td className="py-3 px-4 text-slate-800">{getOperadorName(p.operadorId)}</td>
                    <td className="py-3 px-4 font-medium text-indigo-700">{getMotivoDesc(p.motivoParadaId)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">{p.tempoMinutos} min</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {p.horaInicio || '--:--'} às {p.horaFim || '--:--'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 italic max-w-xs truncate">{p.observacoes || '-'}</td>
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
