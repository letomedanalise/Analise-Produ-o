'use client';

import React from 'react';
import {
  LayoutDashboard,
  ClipboardPenLine,
  TrendingUp,
  AlertTriangle,
  Clock,
  Cpu,
  Users,
  Award,
  FileBarChart,
  FolderKanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  Factory,
  Menu,
  X,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'lancamentos'
  | 'producao'
  | 'perdas'
  | 'paradas'
  | 'maquinas'
  | 'operadores'
  | 'premiacao'
  | 'relatorios'
  | 'cadastros'
  | 'configuracoes';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  group?: 'principal' | 'gestao' | 'sistema';
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'principal' },
  { key: 'lancamentos', label: 'Lançamentos', icon: ClipboardPenLine, badge: 'Diário', group: 'principal' },
  { key: 'producao', label: 'Produção', icon: TrendingUp, group: 'gestao' },
  { key: 'perdas', label: 'Perdas & Refugos', icon: AlertTriangle, group: 'gestao' },
  { key: 'paradas', label: 'Paradas', icon: Clock, group: 'gestao' },
  { key: 'maquinas', label: 'Máquinas', icon: Cpu, group: 'gestao' },
  { key: 'operadores', label: 'Operadores', icon: Users, group: 'gestao' },
  { key: 'premiacao', label: 'Premiação', icon: Award, group: 'gestao' },
  { key: 'relatorios', label: 'Relatórios', icon: FileBarChart, group: 'gestao' },
  { key: 'cadastros', label: 'Cadastros', icon: FolderKanban, badge: '5 Tabelas', group: 'sistema' },
  { key: 'configuracoes', label: 'Configurações', icon: Settings, group: 'sistema' },
];

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const renderNavGroup = (groupName: string, items: NavItem[]) => (
    <div className="mb-4">
      {!collapsed && (
        <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {groupName}
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => {
                  onSelectTab(item.key);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-700/80 text-white'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {collapsed && isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-l-md" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const principalItems = NAV_ITEMS.filter((i) => i.group === 'principal');
  const gestaoItems = NAV_ITEMS.filter((i) => i.group === 'gestao');
  const sistemaItems = NAV_ITEMS.filter((i) => i.group === 'sistema');

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ease-in-out ${
          collapsed ? 'w-18' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-15 border-b border-slate-200 flex items-center justify-between px-3.5 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
              <Factory className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 text-sm tracking-tight leading-tight truncate">
                  PCP Industrial
                </span>
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  Extrusão • Impressão • Corte
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 lg:hidden rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {renderNavGroup('Principal', principalItems)}
          {renderNavGroup('Operações & Controle', gestaoItems)}
          {renderNavGroup('Estrutura & Parâmetros', sistemaItems)}
        </div>

        {/* Footer with Collapse Button */}
        <div className="p-3 border-t border-slate-200 shrink-0 bg-slate-50/70">
          <div className="hidden lg:flex items-center justify-between">
            {!collapsed && (
              <div className="text-[11px] text-slate-500 font-medium">
                v1.0 • Etapa 1 Fundação
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors mx-auto lg:mx-0"
              title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileTopBar({
  onOpenMobileSidebar,
  currentTitle,
}: {
  onOpenMobileSidebar: () => void;
  currentTitle: string;
}) {
  return (
    <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 border-b border-slate-800">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md"
          title="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-semibold text-sm tracking-tight">{currentTitle}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
        <Factory className="w-4 h-4" />
        <span>PCP Industrial</span>
      </div>
    </div>
  );
}
