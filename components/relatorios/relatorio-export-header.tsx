'use client';

import React from 'react';
import { FileText, Calendar, Filter, Building2, Clock } from 'lucide-react';
import { useProductionDB } from '@/lib/db-context';

interface RelatorioExportHeaderProps {
  tituloRelatorio: string;
  subtitulo?: string;
  periodoRotulo: string;
  filtrosDescricao: string;
  dataGeracao?: string;
}

export function RelatorioExportHeader({
  tituloRelatorio,
  subtitulo,
  periodoRotulo,
  filtrosDescricao,
  dataGeracao,
}: RelatorioExportHeaderProps) {
  const { data } = useProductionDB();
  const nomeEmpresa = data.configuracoes?.nomeEmpresa || 'Plásticos Brasil Indústria & Embalagens Ltda';
  const cnpj = data.configuracoes?.cnpj || '12.345.678/0001-90';

  const dataAtual = dataGeracao || new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs print:border-b-2 print:border-slate-800 print:shadow-none print:rounded-none print:p-2 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 print:pb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg print:w-8 print:h-8 print:text-sm">
            PB
          </div>
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
              RELATÓRIO DE PRODUÇÃO INDUSTRIAL
            </span>
            <h1 className="text-xl font-black text-slate-900 leading-tight print:text-lg">
              {tituloRelatorio}
            </h1>
            {subtitulo && <p className="text-xs text-slate-500 print:hidden">{subtitulo}</p>}
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 space-y-0.5">
          <div className="flex items-center gap-1.5 md:justify-end font-semibold text-slate-800">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{nomeEmpresa}</span>
          </div>
          <p className="text-[11px] text-slate-400">CNPJ: {cnpj}</p>
          <div className="flex items-center gap-1.5 md:justify-end text-[11px] text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Gerado em: {dataAtual}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-slate-100 print:bg-white print:p-1 print:border-none print:m-0">
        <div className="flex items-center gap-2 text-slate-700">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Período Analisado:</strong> {periodoRotulo}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Filtros Aplicados:</strong> {filtrosDescricao || 'Todos os setores, máquinas, operadores e produtos'}
          </span>
        </div>
      </div>
    </div>
  );
}
