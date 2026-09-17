'use client';

import React from 'react';
import { useProductionDB } from '@/lib/db-context';
import { Factory, CheckCircle2, RefreshCw, Layers, Cpu, Users, Cloud, Database } from 'lucide-react';

interface HeaderProps {
  currentTabTitle: string;
  currentTabSubtitle?: string;
}

export function Header({ currentTabTitle, currentTabSubtitle }: HeaderProps) {
  const { data, isSaving, saveStatusMessage, refreshData, supabaseInfo } = useProductionDB();

  const activeMachines = data.maquinas.filter((m) => m.ativo && m.status === 'operando').length;
  const activeOperators = data.operadores.filter((o) => o.ativo).length;
  const activeSectors = data.setores.filter((s) => s.ativo).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 py-3.5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Título da Tela Atual */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {currentTabTitle}
            </h1>
            {saveStatusMessage && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {saveStatusMessage}
              </span>
            )}
          </div>
          {currentTabSubtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {currentTabSubtitle}
            </p>
          )}
        </div>

        {/* Informações da Fábrica & Status */}
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          {/* Status do Armazenamento */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
              supabaseInfo.tableExists
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}
            title={supabaseInfo.tableExists ? 'Conectado à nuvem Supabase' : 'Armazenamento persistente local ativo e protegido'}
          >
            {supabaseInfo.tableExists ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supabase Nuvem Ativo</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Armazenamento Seguro Ativo</span>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-slate-600">
            <div className="flex items-center gap-1.5" title="Setores ativos">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                <strong className="text-slate-800">{activeSectors}</strong> Setores
              </span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5" title="Máquinas operando">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                <strong className="text-slate-800">{activeMachines}</strong> Máquinas Rodando
              </span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5" title="Operadores ativos">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>
                <strong className="text-slate-800">{activeOperators}</strong> Operadores
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 font-medium text-xs">
              <Factory className="w-3.5 h-3.5 text-slate-500" />
              {data.configuracoes.nomeEmpresa}
            </span>

            <button
              onClick={() => refreshData()}
              title="Recarregar Dados"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
