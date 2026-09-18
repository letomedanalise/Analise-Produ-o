'use client';

import React, { useState } from 'react';
import { ProductionProvider } from '@/lib/db-context';
import { Sidebar, MobileTopBar, TabKey } from '@/components/sidebar';
import { Header } from '@/components/header';

// Views
import { DashboardView } from '@/components/views/dashboard-view';
import { LancamentosView } from '@/components/views/lancamentos-view';
import { ProducaoView } from '@/components/views/producao-view';
import { PerdasView } from '@/components/views/perdas-view';
import { ParadasView } from '@/components/views/paradas-view';
import { MaquinasView } from '@/components/views/maquinas-view';
import { OperadoresView } from '@/components/views/operadores-view';
import { PremiacaoView } from '@/components/views/premiacao-view';
import { RelatoriosView } from '@/components/views/relatorios-view';
import { CadastrosView } from '@/components/views/cadastros-view';
import { ConfiguracoesView } from '@/components/views/configuracoes-view';

const TAB_TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Painel Geral de Produção',
    subtitle: 'Visão executiva integrada de produção, perdas, máquinas e produtividade.',
  },
  lancamentos: {
    title: 'Apontamento Diário de Produção & Paradas',
    subtitle: 'Lançamento rápido de turnos, materiais, pesos e registro de paradas de máquinas.',
  },
  producao: {
    title: 'Módulo de Produção',
    subtitle: 'Acompanhamento de volumes brutos, líquidos, rendimento e histórico por setor.',
  },
  perdas: {
    title: 'Perdas, Aparas e Refugos',
    subtitle: 'Controle rigoroso de sucata, percentuais de perdas e metas por setor.',
  },
  paradas: {
    title: 'Paradas de Máquinas',
    subtitle: 'Registro e análise de causas de inatividade e gargalos operacionais.',
  },
  maquinas: {
    title: 'Parque de Máquinas',
    subtitle: 'Monitoramento do status operacional e produtividade do maquinário.',
  },
  operadores: {
    title: 'Operadores da Produção',
    subtitle: 'Gestão da equipe de chão de fábrica, turnos e metas de qualidade.',
  },
  premiacao: {
    title: 'Programa de Premiação por Menor Perda',
    subtitle: 'Cálculo automatizado do ranking de operadores com menor índice de refugo.',
  },
  relatorios: {
    title: 'Relatórios Industriais',
    subtitle: 'Consolidações automáticas, fechamento diário e exportação em CSV/Excel.',
  },
  cadastros: {
    title: 'Cadastros Iniciais do Sistema',
    subtitle: 'Gerenciamento dinâmico de Setores, Máquinas, Operadores, Produtos, Turnos e Motivos de Parada.',
  },
  configuracoes: {
    title: 'Configurações e Backup',
    subtitle: 'Parâmetros da fábrica, exportação de backup JSON e restauração de dados.',
  },
};

function MainContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [navResetKey, setNavResetKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sempre que o usuário clica no item de um menu, volta para a página
  // inicial daquele menu (mesmo que já esteja numa sub-tela preenchendo dados).
  const handleSelectTab = (tab: TabKey) => {
    if (tab === activeTab) {
      setNavResetKey((k) => k + 1);
    } else {
      setActiveTab(tab);
    }
  };

  const currentTabInfo = TAB_TITLES[activeTab] || {
    title: 'PCP Industrial',
    subtitle: 'Sistema de Gestão da Produção',
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'lancamentos':
        return <LancamentosView navResetKey={navResetKey} />;
      case 'producao':
        return <ProducaoView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'perdas':
        return <PerdasView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'paradas':
        return <ParadasView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'maquinas':
        return <MaquinasView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'operadores':
        return <OperadoresView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'premiacao':
        return <PremiacaoView />;
      case 'relatorios':
        return <RelatoriosView />;
      case 'cadastros':
        return <CadastrosView />;
      case 'configuracoes':
        return <ConfiguracoesView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Barra de Topo no Mobile */}
      <MobileTopBar
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        currentTitle={currentTabInfo.title}
      />

      {/* Menu Lateral */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Área de Conteúdo Principal */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-18' : 'lg:pl-64'
        }`}
      >
        {activeTab !== 'lancamentos' && (
          <Header
            currentTabTitle={currentTabInfo.title}
            currentTabSubtitle={currentTabInfo.subtitle}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProductionProvider>
      <MainContent />
    </ProductionProvider>
  );
}
