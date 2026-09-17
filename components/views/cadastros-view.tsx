'use client';

import React, { useState } from 'react';
import { useProductionDB } from '@/lib/db-context';
import {
  Users,
  Layers,
  Cpu,
  Package,
  Clock,
  AlertCircle,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Filter,
  X,
} from 'lucide-react';
import {
  Setor,
  Maquina,
  Operador,
  Produto,
  Turno,
  MotivoParada,
  UnidadeMedida,
  StatusMaquina,
  TipoParada,
  TipoMaterial,
} from '@/lib/types';

type CadastroTab = 'operadores' | 'setores' | 'maquinas' | 'produtos' | 'turnos' | 'motivos';

export function CadastrosView() {
  const {
    data,
    addOperador,
    updateOperador,
    toggleOperadorAtivo,
    deleteOperador,
    addSetor,
    updateSetor,
    toggleSetorAtivo,
    deleteSetor,
    addMaquina,
    updateMaquina,
    toggleMaquinaAtivo,
    deleteMaquina,
    addProduto,
    updateProduto,
    toggleProdutoAtivo,
    deleteProduto,
    addTurno,
    updateTurno,
    toggleTurnoAtivo,
    deleteTurno,
    addMotivoParada,
    updateMotivoParada,
    toggleMotivoParadaAtivo,
    deleteMotivoParada,
  } = useProductionDB();

  const [currentSubTab, setCurrentSubTab] = useState<CadastroTab>('operadores');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');

  // Modais de Criação / Edição
  const [modalType, setModalType] = useState<CadastroTab | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Auxiliares de busca
  const filterByStatus = (ativo: boolean) => {
    if (statusFilter === 'ativos') return ativo;
    if (statusFilter === 'inativos') return !ativo;
    return true;
  };

  const tabsConfig = [
    { key: 'operadores' as const, label: 'Operadores', icon: Users, count: data.operadores.length },
    { key: 'setores' as const, label: 'Setores', icon: Layers, count: data.setores.length },
    { key: 'maquinas' as const, label: 'Máquinas', icon: Cpu, count: data.maquinas.length },
    { key: 'produtos' as const, label: 'Produtos', icon: Package, count: data.produtos.length },
    { key: 'motivos' as const, label: 'Motivos de Parada', icon: AlertCircle, count: data.motivosParada.length },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Tabs de Navegação dos Cadastros */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isSelected = currentSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setCurrentSubTab(tab.key);
                  setSearchTerm('');
                  setStatusFilter('todos');
                }}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros e Ação "Novo Cadastro" */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Pesquisar em ${tabsConfig.find((t) => t.key === currentSubTab)?.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="todos">Todos</option>
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Apenas Inativos</option>
            </select>
          </div>
        </div>

        {/* Botão Novo Cadastro */}
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setModalType(currentSubTab);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo {tabsConfig.find((t) => t.key === currentSubTab)?.label.slice(0, -1) || 'Item'}</span>
        </button>
      </div>

      {/* Renderização da Tabela Específica */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {currentSubTab === 'operadores' && (
          <TabelaOperadores
            operadores={data.operadores
              .filter((op) => filterByStatus(op.ativo))
              .filter(
                (op) =>
                  op.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  op.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (op.cargo && op.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
              )}
            setores={data.setores}
            turnos={data.turnos}
            onEdit={(op) => {
              setEditingItem(op);
              setModalType('operadores');
            }}
            onToggleStatus={toggleOperadorAtivo}
            onDelete={(id) => {
              if (window.confirm('Tem certeza que deseja excluir este operador?')) {
                deleteOperador(id);
              }
            }}
          />
        )}

        {currentSubTab === 'setores' && (
          <TabelaSetores
            setores={data.setores
              .filter((s) => filterByStatus(s.ativo))
              .filter(
                (s) =>
                  s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.codigo.toLowerCase().includes(searchTerm.toLowerCase())
              )}
            maquinasCountBySetor={data.maquinas.reduce((acc, m) => {
              acc[m.setorId] = (acc[m.setorId] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)}
            operadoresCountBySetor={data.operadores.reduce((acc, op) => {
              acc[op.setorId] = (acc[op.setorId] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)}
            onEdit={(s) => {
              setEditingItem(s);
              setModalType('setores');
            }}
            onToggleStatus={toggleSetorAtivo}
            onDelete={(id) => {
              if (window.confirm('Tem certeza que deseja excluir este setor?')) {
                deleteSetor(id);
              }
            }}
          />
        )}

        {currentSubTab === 'maquinas' && (
          <TabelaMaquinas
            maquinas={data.maquinas
              .filter((m) => filterByStatus(m.ativo))
              .filter(
                (m) =>
                  m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (m.modelo && m.modelo.toLowerCase().includes(searchTerm.toLowerCase()))
              )}
            setores={data.setores}
            onEdit={(m) => {
              setEditingItem(m);
              setModalType('maquinas');
            }}
            onToggleStatus={toggleMaquinaAtivo}
            onDelete={(id) => {
              if (window.confirm('Tem certeza que deseja excluir esta máquina?')) {
                deleteMaquina(id);
              }
            }}
          />
        )}

        {currentSubTab === 'produtos' && (
          <TabelaProdutos
            produtos={data.produtos
              .filter((p) => filterByStatus(p.ativo))
              .filter(
                (p) =>
                  p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.tipoMaterial.toLowerCase().includes(searchTerm.toLowerCase())
              )}
            setores={data.setores}
            onEdit={(p) => {
              setEditingItem(p);
              setModalType('produtos');
            }}
            onToggleStatus={toggleProdutoAtivo}
            onDelete={(id) => {
              if (window.confirm('Tem certeza que deseja excluir este produto?')) {
                deleteProduto(id);
              }
            }}
          />
        )}

        {currentSubTab === 'motivos' && (
          <TabelaMotivosParada
            motivos={data.motivosParada
              .filter((m) => filterByStatus(m.ativo))
              .filter(
                (m) =>
                  m.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.codigo.toLowerCase().includes(searchTerm.toLowerCase())
              )}
            setores={data.setores}
            onEdit={(m) => {
              setEditingItem(m);
              setModalType('motivos');
            }}
            onToggleStatus={toggleMotivoParadaAtivo}
            onDelete={(id) => {
              if (window.confirm('Tem certeza que deseja excluir este motivo de parada?')) {
                deleteMotivoParada(id);
              }
            }}
          />
        )}
      </div>

      {/* Modal Genérico / Formulário */}
      {modalType && (
        <ModalCadastro
          type={modalType}
          initialData={editingItem}
          setores={data.setores}
          turnos={data.turnos}
          onClose={() => {
            setModalType(null);
            setEditingItem(null);
          }}
          onSave={(payload) => {
            if (modalType === 'operadores') {
              if (editingItem) updateOperador(editingItem.id, payload);
              else addOperador(payload);
            } else if (modalType === 'setores') {
              if (editingItem) updateSetor(editingItem.id, payload);
              else addSetor(payload);
            } else if (modalType === 'maquinas') {
              if (editingItem) updateMaquina(editingItem.id, payload);
              else addMaquina(payload);
            } else if (modalType === 'produtos') {
              if (editingItem) updateProduto(editingItem.id, payload);
              else addProduto(payload);
            } else if (modalType === 'turnos') {
              if (editingItem) updateTurno(editingItem.id, payload);
              else addTurno(payload);
            } else if (modalType === 'motivos') {
              if (editingItem) updateMotivoParada(editingItem.id, payload);
              else addMotivoParada(payload);
            }
            setModalType(null);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// ================= TABELAS INDIVIDUAIS ================= //

function TabelaOperadores({
  operadores,
  setores,
  turnos,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  operadores: Operador[];
  setores: Setor[];
  turnos: Turno[];
  onEdit: (op: Operador) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const getSetorName = (id: string) => setores.find((s) => s.id === id)?.nome || 'Todos / Geral';
  const getTurnoName = (id?: string) => turnos.find((t) => t.id === id)?.nome || 'Flexível';

  if (operadores.length === 0) {
    return <EmptyState message="Nenhum operador encontrado com os filtros aplicados." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Nome do Operador</th>
            <th className="py-3 px-4">Setor Principal</th>
            <th className="py-3 px-4 text-center">Meta Perda Máx.</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {operadores.map((op) => (
            <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3 px-4 font-semibold text-slate-900">
                {op.nome}
                {op.cargo && <span className="block text-[11px] font-normal text-slate-500">{op.cargo}</span>}
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                  {getSetorName(op.setorId)}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  ≤ {op.metaPerdaMaximaPercent}%
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleStatus(op.id)}
                  title="Clique para alternar Ativo/Inativo"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    op.ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {op.ativo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {op.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(op)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Editar operador"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(op.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Excluir operador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaSetores({
  setores,
  maquinasCountBySetor,
  operadoresCountBySetor,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  setores: Setor[];
  maquinasCountBySetor: Record<string, number>;
  operadoresCountBySetor: Record<string, number>;
  onEdit: (s: Setor) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (setores.length === 0) {
    return <EmptyState message="Nenhum setor cadastrado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Nome do Setor</th>
            <th className="py-3 px-4">Unidade Padrão</th>
            <th className="py-3 px-4 text-center">Máquinas</th>
            <th className="py-3 px-4 text-center">Operadores</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {setores.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3 px-4">
                <span className="font-semibold text-slate-900">{s.nome}</span>
                {s.descricao && <span className="block text-xs text-slate-500 line-clamp-1">{s.descricao}</span>}
              </td>
              <td className="py-3 px-4 text-slate-600">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs uppercase">{s.unidadePadrao}</span>
              </td>
              <td className="py-3 px-4 text-center font-medium text-slate-700">
                {maquinasCountBySetor[s.id] || 0}
              </td>
              <td className="py-3 px-4 text-center font-medium text-slate-700">
                {operadoresCountBySetor[s.id] || 0}
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleStatus(s.id)}
                  title="Clique para alternar Ativo/Inativo"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    s.ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {s.ativo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {s.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(s)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaMaquinas({
  maquinas,
  setores,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  maquinas: Maquina[];
  setores: Setor[];
  onEdit: (m: Maquina) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const getSetorName = (id: string) => setores.find((s) => s.id === id)?.nome || 'Sem Setor';

  if (maquinas.length === 0) {
    return <EmptyState message="Nenhuma máquina cadastrada." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Nome / Modelo</th>
            <th className="py-3 px-4">Setor</th>
            <th className="py-3 px-4 text-center">Capac. Nominal</th>
            <th className="py-3 px-4 text-center">Status Operacional</th>
            <th className="py-3 px-4 text-center">Ativo</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {maquinas.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3 px-4">
                <span className="font-semibold text-slate-900">{m.nome}</span>
                {m.modelo && <span className="block text-xs text-slate-500">Modelo: {m.modelo}</span>}
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                  {getSetorName(m.setorId)}
                </span>
              </td>
              <td className="py-3 px-4 text-center font-medium text-slate-700">
                {m.capacidadeNominalHora} kg/h
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    m.status === 'operando'
                      ? 'bg-emerald-50 text-emerald-700'
                      : m.status === 'parada'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {m.status === 'operando' ? 'Operando' : m.status === 'parada' ? 'Parada' : 'Manutenção'}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleStatus(m.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    m.ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {m.ativo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaProdutos({
  produtos,
  setores,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  produtos: Produto[];
  setores: Setor[];
  onEdit: (p: Produto) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const getSetorName = (id: string) => setores.find((s) => s.id === id)?.nome || 'Setor Padrão';

  if (produtos.length === 0) {
    return <EmptyState message="Nenhum produto cadastrado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Descrição do Produto</th>
            <th className="py-3 px-4">Material</th>
            <th className="py-3 px-4">Setor Origem</th>
            <th className="py-3 px-4">Dimensões / Specs</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {produtos.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3 px-4 font-semibold text-slate-900">{p.descricao}</td>
              <td className="py-3 px-4">
                <span className="font-mono px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                  {p.tipoMaterial}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-600">{getSetorName(p.setorOrigemId)}</td>
              <td className="py-3 px-4 text-xs text-slate-500">
                {p.larguraMm ? `Larg: ${p.larguraMm}mm ` : ''}
                {p.espessuraMicras ? `| Esp: ${p.espessuraMicras}µm ` : ''}
                {p.comprimentoMm ? `| Comp: ${p.comprimentoMm}mm ` : ''}
                {p.pesoPadraoMilheiroKg ? `| ${p.pesoPadraoMilheiroKg} kg/milheiro` : ''}
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleStatus(p.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    p.ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {p.ativo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaTurnos({
  turnos,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  turnos: Turno[];
  onEdit: (t: Turno) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (turnos.length === 0) {
    return <EmptyState message="Nenhum turno cadastrado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Código</th>
            <th className="py-3 px-4">Nome do Turno</th>
            <th className="py-3 px-4">Horário de Início</th>
            <th className="py-3 px-4">Horário de Término</th>
            <th className="py-3 px-4 text-center">Carga Horária</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {turnos.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3 px-4 font-mono font-bold text-slate-800">{t.codigo}</td>
              <td className="py-3 px-4 font-semibold text-slate-900">{t.nome}</td>
              <td className="py-3 px-4 font-mono text-slate-700">{t.horaInicio}</td>
              <td className="py-3 px-4 font-mono text-slate-700">{t.horaFim}</td>
              <td className="py-3 px-4 text-center text-slate-600">
                {t.cargaHorariaMinutos} min ({(t.cargaHorariaMinutos / 60).toFixed(1)} h)
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleStatus(t.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    t.ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {t.ativo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {t.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(t)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaMotivosParada({
  motivos,
  setores,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  motivos: MotivoParada[];
  setores: Setor[];
  onEdit: (m: MotivoParada) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const getSetorName = (id?: string) => (id ? setores.find((s) => s.id === id)?.nome || 'Geral' : 'Todos os Setores');

  if (motivos.length === 0) {
    return <EmptyState message="Nenhum motivo de parada cadastrado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Descrição do Motivo de Parada</th>
            <th className="py-3 px-4">Tipo de Parada</th>
            <th className="py-3 px-4">Setor Aplicável</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {motivos.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3 px-4 font-semibold text-slate-900">{m.descricao}</td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    m.tipo === 'programada'
                      ? 'bg-blue-50 text-blue-700'
                      : m.tipo === 'operacional'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {m.tipo === 'programada'
                    ? 'Programada'
                    : m.tipo === 'operacional'
                    ? 'Operacional'
                    : 'Não Programada / Corretiva'}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-600">{getSetorName(m.setorId)}</td>
              <td className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleStatus(m.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    m.ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {m.ativo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-slate-500">
      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ================= MODAL DE FORMULÁRIO DINÂMICO ================= //

function ModalCadastro({
  type,
  initialData,
  setores,
  turnos,
  onClose,
  onSave,
}: {
  type: CadastroTab;
  initialData: any;
  setores: Setor[];
  turnos: Turno[];
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<any>(
    initialData || {
      ativo: true,
      // Default initial states based on type
      ...(type === 'operadores'
        ? {
            matricula: '',
            nome: '',
            setorId: setores[0]?.id || '',
            turnoPadraoId: turnos[0]?.id || '',
            metaPerdaMaximaPercent: 2.5,
            cargo: '',
          }
        : {}),
      ...(type === 'setores'
        ? {
            codigo: '',
            nome: '',
            descricao: '',
            unidadePadrao: 'kg' as UnidadeMedida,
            ordem: setores.length + 1,
          }
        : {}),
      ...(type === 'maquinas'
        ? {
            codigo: '',
            nome: '',
            setorId: setores[0]?.id || '',
            capacidadeNominalHora: 80,
            status: 'operando' as StatusMaquina,
            modelo: '',
            anoFabricacao: new Date().getFullYear(),
          }
        : {}),
      ...(type === 'produtos'
        ? {
            codigo: '',
            descricao: '',
            setorOrigemId: setores[0]?.id || '',
            tipoMaterial: 'PEBD' as TipoMaterial,
            larguraMm: 400,
            espessuraMicras: 50,
          }
        : {}),
      ...(type === 'turnos'
        ? {
            codigo: `T${turnos.length + 1}`,
            nome: '',
            horaInicio: '06:00',
            horaFim: '14:20',
            cargaHorariaMinutos: 480,
          }
        : {}),
      ...(type === 'motivos'
        ? {
            codigo: 'PAR-',
            descricao: '',
            tipo: 'operacional' as TipoParada,
            setorId: '',
          }
        : {}),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getTitle = () => {
    const titles: Record<CadastroTab, string> = {
      operadores: 'Operador',
      setores: 'Setor de Produção',
      maquinas: 'Máquina',
      produtos: 'Produto',
      turnos: 'Turno de Trabalho',
      motivos: 'Motivo de Parada',
    };
    return `${isEditing ? 'Editar' : 'Cadastrar Novo'} ${titles[type]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">{getTitle()}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* CAMPOS ESPECÍFICOS: OPERADORES */}
          {type === 'operadores' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Matrícula *</label>
                  <input
                    type="text"
                    required
                    value={formData.matricula || ''}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: OP-105"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Meta Perda Máxima (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.metaPerdaMaximaPercent || 0}
                    onChange={(e) => setFormData({ ...formData, metaPerdaMaximaPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Nome do colaborador"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Setor Principal *</label>
                <select
                  value={formData.setorId || ''}
                  onChange={(e) => setFormData({ ...formData, setorId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  value={formData.cargo || ''}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Ex: Operador de Extrusão Líder"
                />
              </div>
            </>
          )}

          {/* CAMPOS ESPECÍFICOS: SETORES */}
          {type === 'setores' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código / Sigla *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase font-mono"
                    placeholder="Ex: REC"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade Padrão *</label>
                  <select
                    value={formData.unidadePadrao || 'kg'}
                    onChange={(e) => setFormData({ ...formData, unidadePadrao: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="milheiro">milheiro (Milhares de un.)</option>
                    <option value="metros">metros (Metros lineares)</option>
                    <option value="unidade">unidade (Peças)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Setor *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Ex: Recuperação e Moagem"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição do Processo</label>
                <textarea
                  rows={2}
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Breve descrição da etapa fabril"
                />
              </div>
            </>
          )}

          {/* CAMPOS ESPECÍFICOS: MÁQUINAS */}
          {type === 'maquinas' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código da Máquina *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase font-mono"
                    placeholder="Ex: EXT-03"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Setor *</label>
                  <select
                    value={formData.setorId || ''}
                    onChange={(e) => setFormData({ ...formData, setorId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Máquina *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Ex: Extrusora Carnevalli 90mm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacidade Nominal (kg/h) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formData.capacidadeNominalHora || 0}
                    onChange={(e) => setFormData({ ...formData, capacidadeNominalHora: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Operacional</label>
                  <select
                    value={formData.status || 'operando'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="operando">Operando Normalmente</option>
                    <option value="parada">Parada / Aguardando</option>
                    <option value="manutencao">Em Manutenção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo / Fabricante</label>
                <input
                  type="text"
                  value={formData.modelo || ''}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Ex: Carnevalli E-90 Plus"
                />
              </div>
            </>
          )}

          {/* CAMPOS ESPECÍFICOS: PRODUTOS */}
          {type === 'produtos' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código do Produto *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase font-mono"
                    placeholder="Ex: BOB-PEBD-12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Material *</label>
                  <select
                    value={formData.tipoMaterial || 'PEBD'}
                    onChange={(e) => setFormData({ ...formData, tipoMaterial: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PEBD">PEBD (Polietileno Baixa Densidade)</option>
                    <option value="PEAD">PEAD (Polietileno Alta Densidade)</option>
                    <option value="PP">PP (Polipropileno)</option>
                    <option value="BOPP">BOPP</option>
                    <option value="Reciclado">Reciclado / Canela / Cristal</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Completa *</label>
                <input
                  type="text"
                  required
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Ex: Bobina Tubular PEBD Cristal 60cm x 0.06mm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Setor Origem *</label>
                  <select
                    value={formData.setorOrigemId || ''}
                    onChange={(e) => setFormData({ ...formData, setorOrigemId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Largura (mm)</label>
                  <input
                    type="number"
                    value={formData.larguraMm || ''}
                    onChange={(e) => setFormData({ ...formData, larguraMm: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    placeholder="Ex: 400"
                  />
                </div>
              </div>
            </>
          )}

          {/* CAMPOS ESPECÍFICOS: TURNOS */}
          {type === 'turnos' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código do Turno *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono uppercase"
                    placeholder="Ex: T1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Carga Horária (minutos) *</label>
                  <input
                    type="number"
                    required
                    value={formData.cargaHorariaMinutos || 480}
                    onChange={(e) => setFormData({ ...formData, cargaHorariaMinutos: parseInt(e.target.value) || 480 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Turno *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Ex: Turno 1 - Manhã (06:00 às 14:20)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Início *</label>
                  <input
                    type="time"
                    required
                    value={formData.horaInicio || '06:00'}
                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Fim *</label>
                  <input
                    type="time"
                    required
                    value={formData.horaFim || '14:20'}
                    onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </>
          )}

          {/* CAMPOS ESPECÍFICOS: MOTIVOS DE PARADA */}
          {type === 'motivos' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código do Motivo *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono uppercase"
                    placeholder="Ex: PAR-BOB"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Parada *</label>
                  <select
                    value={formData.tipo || 'operacional'}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="operacional">Operacional (Setup, Troca bobina, etc.)</option>
                    <option value="nao_programada">Não Programada (Quebra, falha elétrica)</option>
                    <option value="programada">Programada (Manutenção preventiva, 5S)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição do Motivo *</label>
                <input
                  type="text"
                  required
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  placeholder="Ex: Falha na resistência de aquecimento"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Setor Específico (Opcional)</label>
                <select
                  value={formData.setorId || ''}
                  onChange={(e) => setFormData({ ...formData, setorId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Aplicável a Todos os Setores</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Status Ativo / Inativo Comum */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <input
              type="checkbox"
              id="modal-item-ativo"
              checked={formData.ativo ?? true}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="modal-item-ativo" className="text-xs font-medium text-slate-700 select-none">
              Cadastro Ativo no Sistema
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
            >
              {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
