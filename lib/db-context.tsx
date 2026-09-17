'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DatabaseSchema,
  Setor,
  Maquina,
  Operador,
  Produto,
  Turno,
  MotivoParada,
  LancamentoProducao,
  LancamentoParada,
  RegraPremiacao,
} from './types';
import { INITIAL_DATABASE_DATA } from './default-data';
import { getDemoLancamentos } from './demo-data';

const STORAGE_KEY = 'gestao_producao_db_v2';
const STORAGE_KEY_BACKUP = 'gestao_producao_backup_v2';
const LEGACY_STORAGE_KEYS = ['gestao_producao_backup_v2', 'gestao_producao_db_v2', 'gestao_producao_db'];

function getStoredLocalData(): DatabaseSchema | null {
  if (typeof window === 'undefined') return null;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.setores) && parsed.setores.length > 0) {
          return parsed as DatabaseSchema;
        }
      }
    } catch {
      // continua procurando nas outras chaves
    }
  }
  return null;
}

function saveToLocalStorages(data: DatabaseSchema) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_KEY_BACKUP, serialized);
  } catch (e) {
    console.warn('Erro ao gravar no localStorage:', e);
  }
}

function mergeDatabases(local: DatabaseSchema | null, server: DatabaseSchema | null): DatabaseSchema {
  if (!local && !server) return INITIAL_DATABASE_DATA;
  if (!local) return server || INITIAL_DATABASE_DATA;
  if (!server) return local;

  // Preserva e mescla lançamentos de produção - NUNCA zera o histórico do operador
  const localLancamentos = Array.isArray(local.lancamentosProducao) ? local.lancamentosProducao : [];
  const serverLancamentos = Array.isArray(server.lancamentosProducao) ? server.lancamentosProducao : [];

  const mergedLancamentosMap = new Map<string, LancamentoProducao>();
  for (const item of serverLancamentos) {
    if (item && item.id) mergedLancamentosMap.set(item.id, item);
  }
  for (const item of localLancamentos) {
    if (item && item.id) {
      const existing = mergedLancamentosMap.get(item.id);
      if (!existing) {
        mergedLancamentosMap.set(item.id, item);
      } else {
        const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const timeLocal = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (timeLocal >= timeExisting) {
          mergedLancamentosMap.set(item.id, item);
        }
      }
    }
  }

  // Preserva e mescla lançamentos de parada
  const localParadas = Array.isArray(local.lancamentosParada) ? local.lancamentosParada : [];
  const serverParadas = Array.isArray(server.lancamentosParada) ? server.lancamentosParada : [];
  const mergedParadasMap = new Map<string, LancamentoParada>();
  for (const item of serverParadas) {
    if (item && item.id) mergedParadasMap.set(item.id, item);
  }
  for (const item of localParadas) {
    if (item && item.id) mergedParadasMap.set(item.id, item);
  }

  // Mescla por ID preservando cadastros novos do servidor (como máquinas de impressão) e cadastros locais
  const mergeById = <T extends { id: string }>(serverList: T[] = [], localList: T[] = []): T[] => {
    const map = new Map<string, T>();
    for (const item of serverList || []) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of localList || []) {
      if (item && item.id) map.set(item.id, item);
    }
    return Array.from(map.values());
  };

  return {
    configuracoes: {
      ...INITIAL_DATABASE_DATA.configuracoes,
      ...server.configuracoes,
      ...local.configuracoes,
    },
    setores: mergeById(server.setores, local.setores),
    maquinas: mergeById(server.maquinas, local.maquinas),
    operadores: mergeById(server.operadores, local.operadores),
    produtos: mergeById(server.produtos, local.produtos),
    turnos: mergeById(server.turnos, local.turnos),
    motivosParada: mergeById(server.motivosParada, local.motivosParada),
    regrasPremiacao: mergeById(server.regrasPremiacao, local.regrasPremiacao),
    lancamentosProducao: Array.from(mergedLancamentosMap.values()),
    lancamentosParada: Array.from(mergedParadasMap.values()),
  };
}

export interface SupabaseSyncInfo {
  connected: boolean;
  tableExists: boolean;
  source: 'supabase' | 'supabase_seeded' | 'local';
  isChecking: boolean;
  message?: string;
  sqlSetup?: string;
  lastSyncedAt?: string;
}

interface ProductionContextType {
  data: DatabaseSchema;
  loading: boolean;
  isSaving: boolean;
  saveStatusMessage: string | null;
  supabaseInfo: SupabaseSyncInfo;
  checkSupabaseConnection: () => Promise<void>;
  forceSyncToSupabase: () => Promise<boolean>;

  // Setores
  addSetor: (item: Omit<Setor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSetor: (id: string, item: Partial<Setor>) => void;
  toggleSetorAtivo: (id: string) => void;
  deleteSetor: (id: string) => void;

  // Máquinas
  addMaquina: (item: Omit<Maquina, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaquina: (id: string, item: Partial<Maquina>) => void;
  toggleMaquinaAtivo: (id: string) => void;
  deleteMaquina: (id: string) => void;

  // Operadores
  addOperador: (item: Omit<Operador, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOperador: (id: string, item: Partial<Operador>) => void;
  toggleOperadorAtivo: (id: string) => void;
  deleteOperador: (id: string) => void;

  // Produtos
  addProduto: (item: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduto: (id: string, item: Partial<Produto>) => void;
  toggleProdutoAtivo: (id: string) => void;
  deleteProduto: (id: string) => void;

  // Turnos
  addTurno: (item: Omit<Turno, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTurno: (id: string, item: Partial<Turno>) => void;
  toggleTurnoAtivo: (id: string) => void;
  deleteTurno: (id: string) => void;

  // Motivos de Parada
  addMotivoParada: (item: Omit<MotivoParada, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMotivoParada: (id: string, item: Partial<MotivoParada>) => void;
  toggleMotivoParadaAtivo: (id: string) => void;
  deleteMotivoParada: (id: string) => void;

  // Lançamentos de Produção
  addLancamentoProducao: (item: Omit<LancamentoProducao, 'id' | 'createdAt' | 'updatedAt' | 'percentualPerda' | 'produtividadeKgHora'>) => LancamentoProducao;
  updateLancamentoProducao: (id: string, item: Partial<LancamentoProducao>) => void;
  deleteLancamentoProducao: (id: string, softDelete?: boolean) => void;

  // Lançamentos de Parada
  addLancamentoParada: (item: Omit<LancamentoParada, 'id' | 'createdAt'>) => void;
  deleteLancamentoParada: (id: string) => void;

  // Premiação
  updateRegraPremiacao: (setorId: string, rule: Partial<RegraPremiacao>) => void;

  // Utilitários de Banco de Dados
  resetToDefaults: () => Promise<void>;
  clearProductionData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonString: string) => boolean;
  loadDemoData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const ProductionContext = createContext<ProductionContextType | undefined>(undefined);

export function ProductionProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DatabaseSchema>(INITIAL_DATABASE_DATA);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  const [supabaseInfo, setSupabaseInfo] = useState<SupabaseSyncInfo>({
    connected: true,
    tableExists: false,
    source: 'local',
    isChecking: false,
    message: 'Verificando conexão com Supabase...',
  });

  const checkSupabaseConnection = useCallback(async () => {
    setSupabaseInfo((prev) => ({ ...prev, isChecking: true }));
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' }),
      });
      if (res.ok) {
        const json = await res.json();
        setSupabaseInfo({
          connected: !!json.connected,
          tableExists: !!json.tableExists,
          source: json.tableExists ? 'supabase' : 'local',
          isChecking: false,
          message: json.message,
          sqlSetup: json.sqlSetup,
          lastSyncedAt: json.tableExists ? new Date().toLocaleTimeString('pt-BR') : undefined,
        });
        return;
      }
    } catch (err) {
      setSupabaseInfo((prev) => ({
        ...prev,
        isChecking: false,
        message: `Falha ao testar conexão: ${(err as Error).message}`,
      }));
    }
    setSupabaseInfo((prev) => ({ ...prev, isChecking: false }));
  }, []);

  // Força upload do estado atual para o Supabase
  const forceSyncToSupabase = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveStatusMessage('Sincronizando com Supabase...');
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_all', data }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.syncedToSupabase) {
          setSaveStatusMessage('Sincronizado no Supabase!');
          setSupabaseInfo((prev) => ({
            ...prev,
            connected: true,
            tableExists: true,
            source: 'supabase',
            lastSyncedAt: new Date().toLocaleTimeString('pt-BR'),
            message: 'Dados sincronizados em nuvem com sucesso.',
          }));
          setTimeout(() => setSaveStatusMessage(null), 3000);
          return true;
        } else {
          setSaveStatusMessage('Tabela não encontrada no Supabase');
          setTimeout(() => setSaveStatusMessage(null), 3000);
          return false;
        }
      }
    } catch {
      setSaveStatusMessage('Erro de conexão ao sincronizar');
      setTimeout(() => setSaveStatusMessage(null), 3000);
      return false;
    } finally {
      setIsSaving(false);
    }
    return false;
  }, [data]);

  // Carrega dados e atualiza de forma segura sem perder lançamentos
  const refreshData = useCallback(async () => {
    const currentLocal = getStoredLocalData();
    try {
      setIsSaving(true);
      const res = await fetch('/api/db', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const serverData = json.data as DatabaseSchema | undefined;
        const merged = mergeDatabases(currentLocal, serverData || null);
        setData(merged);
        saveToLocalStorages(merged);

        setSupabaseInfo((prev) => ({
          ...prev,
          connected: !!json.supabaseConfigured,
          tableExists: json.source?.startsWith('supabase'),
          source: json.source || 'local',
          sqlSetup: json.sqlSetup,
          message: json.source?.startsWith('supabase')
            ? 'Conectado ao Supabase com dados reais'
            : 'Armazenamento persistente local ativo',
          lastSyncedAt: json.source?.startsWith('supabase')
            ? new Date().toLocaleTimeString('pt-BR')
            : undefined,
        }));
        setIsSaving(false);
        return;
      }
    } catch {
      // Fallback para dados locais
    } finally {
      setIsSaving(false);
    }

    if (currentLocal) {
      setData(currentLocal);
      return;
    }

    setData(INITIAL_DATABASE_DATA);
  }, []);

  useEffect(() => {
    let active = true;

    // 1. Carregamento Imediato do Cache Local para visualização instantânea sem tela zerada
    const immediateLocal = getStoredLocalData();
    if (immediateLocal) {
      setData(immediateLocal);
      setLoading(false);
    }

    async function initData() {
      try {
        const res = await fetch('/api/db', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
          const serverData = json.data as DatabaseSchema | undefined;

          // Mescla de forma inteligente: NUNCA zera o que o usuário cadastrou
          const currentLocal = getStoredLocalData();
          const merged = mergeDatabases(currentLocal || immediateLocal, serverData || null);
          setData(merged);
          saveToLocalStorages(merged);

          // Se o navegador tem lançamentos que o servidor não possui (ex: após deploy na Vercel),
          // envia de volta para atualizar a memória do servidor
          const localLancamentosCount = (currentLocal?.lancamentosProducao?.length || immediateLocal?.lancamentosProducao?.length || 0);
          const serverLancamentosCount = serverData?.lancamentosProducao?.length || 0;
          if (localLancamentosCount > serverLancamentosCount) {
            fetch('/api/db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save_all', data: merged }),
            }).catch(() => {});
          }

          setSupabaseInfo({
            connected: !!json.supabaseConfigured,
            tableExists: json.source?.startsWith('supabase'),
            source: json.source || 'local',
            isChecking: false,
            sqlSetup: json.sqlSetup,
            message: json.source?.startsWith('supabase')
              ? 'Conectado e sincronizado com Supabase'
              : 'Armazenamento persistente local ativo',
            lastSyncedAt: json.source?.startsWith('supabase')
              ? new Date().toLocaleTimeString('pt-BR')
              : undefined,
          });
          setLoading(false);
          return;
        }
      } catch {
        // Falha na requisição: mantém dados locais
      }

      if (!active) return;

      if (!immediateLocal) {
        const local = getStoredLocalData();
        if (local) {
          setData(local);
        } else {
          setData(INITIAL_DATABASE_DATA);
          saveToLocalStorages(INITIAL_DATABASE_DATA);
        }
      }
      setLoading(false);
    }

    initData();
    return () => {
      active = false;
    };
  }, []);

  // Função para salvar estado com dupla camada de persistência
  const persistState = useCallback(async (newData: DatabaseSchema) => {
    setData(newData);
    saveToLocalStorages(newData);

    setIsSaving(true);
    setSaveStatusMessage('Salvando...');
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_all', data: newData }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.syncedToSupabase) {
          setSaveStatusMessage('Salvo no Supabase');
          setSupabaseInfo((prev) => ({
            ...prev,
            connected: true,
            tableExists: true,
            source: 'supabase',
            lastSyncedAt: new Date().toLocaleTimeString('pt-BR'),
          }));
        } else {
          setSaveStatusMessage('Salvo com sucesso');
        }
      } else {
        setSaveStatusMessage('Salvo no navegador');
      }
      setTimeout(() => setSaveStatusMessage(null), 2500);
    } catch {
      setSaveStatusMessage('Salvo no navegador');
      setTimeout(() => setSaveStatusMessage(null), 2500);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // SETORES
  const addSetor = (item: Omit<Setor, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newSetor: Setor = {
      ...item,
      id: `set-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    persistState({
      ...data,
      setores: [...data.setores, newSetor],
    });
  };

  const updateSetor = (id: string, item: Partial<Setor>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      setores: data.setores.map((s) => (s.id === id ? { ...s, ...item, updatedAt: now } : s)),
    });
  };

  const toggleSetorAtivo = (id: string) => {
    const s = data.setores.find((item) => item.id === id);
    if (s) {
      updateSetor(id, { ativo: !s.ativo });
    }
  };

  const deleteSetor = (id: string) => {
    persistState({
      ...data,
      setores: data.setores.filter((s) => s.id !== id),
    });
  };

  // MÁQUINAS
  const addMaquina = (item: Omit<Maquina, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newMaquina: Maquina = {
      ...item,
      id: `maq-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    persistState({
      ...data,
      maquinas: [...data.maquinas, newMaquina],
    });
  };

  const updateMaquina = (id: string, item: Partial<Maquina>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      maquinas: data.maquinas.map((m) => (m.id === id ? { ...m, ...item, updatedAt: now } : m)),
    });
  };

  const toggleMaquinaAtivo = (id: string) => {
    const m = data.maquinas.find((item) => item.id === id);
    if (m) {
      updateMaquina(id, { ativo: !m.ativo });
    }
  };

  const deleteMaquina = (id: string) => {
    persistState({
      ...data,
      maquinas: data.maquinas.filter((m) => m.id !== id),
    });
  };

  // OPERADORES
  const addOperador = (item: Omit<Operador, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newOperador: Operador = {
      ...item,
      id: `op-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    persistState({
      ...data,
      operadores: [...data.operadores, newOperador],
    });
  };

  const updateOperador = (id: string, item: Partial<Operador>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      operadores: data.operadores.map((op) => (op.id === id ? { ...op, ...item, updatedAt: now } : op)),
    });
  };

  const toggleOperadorAtivo = (id: string) => {
    const op = data.operadores.find((item) => item.id === id);
    if (op) {
      updateOperador(id, { ativo: !op.ativo });
    }
  };

  const deleteOperador = (id: string) => {
    persistState({
      ...data,
      operadores: data.operadores.filter((op) => op.id !== id),
    });
  };

  // PRODUTOS
  const addProduto = (item: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProduto: Produto = {
      ...item,
      id: `prod-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    persistState({
      ...data,
      produtos: [...data.produtos, newProduto],
    });
  };

  const updateProduto = (id: string, item: Partial<Produto>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      produtos: data.produtos.map((p) => (p.id === id ? { ...p, ...item, updatedAt: now } : p)),
    });
  };

  const toggleProdutoAtivo = (id: string) => {
    const p = data.produtos.find((item) => item.id === id);
    if (p) {
      updateProduto(id, { ativo: !p.ativo });
    }
  };

  const deleteProduto = (id: string) => {
    persistState({
      ...data,
      produtos: data.produtos.filter((p) => p.id !== id),
    });
  };

  // TURNOS
  const addTurno = (item: Omit<Turno, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTurno: Turno = {
      ...item,
      id: `tur-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    persistState({
      ...data,
      turnos: [...data.turnos, newTurno],
    });
  };

  const updateTurno = (id: string, item: Partial<Turno>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      turnos: data.turnos.map((t) => (t.id === id ? { ...t, ...item, updatedAt: now } : t)),
    });
  };

  const toggleTurnoAtivo = (id: string) => {
    const t = data.turnos.find((item) => item.id === id);
    if (t) {
      updateTurno(id, { ativo: !t.ativo });
    }
  };

  const deleteTurno = (id: string) => {
    persistState({
      ...data,
      turnos: data.turnos.filter((t) => t.id !== id),
    });
  };

  // MOTIVOS DE PARADA
  const addMotivoParada = (item: Omit<MotivoParada, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newMotivo: MotivoParada = {
      ...item,
      id: `mot-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    persistState({
      ...data,
      motivosParada: [...data.motivosParada, newMotivo],
    });
  };

  const updateMotivoParada = (id: string, item: Partial<MotivoParada>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      motivosParada: data.motivosParada.map((m) => (m.id === id ? { ...m, ...item, updatedAt: now } : m)),
    });
  };

  const toggleMotivoParadaAtivo = (id: string) => {
    const m = data.motivosParada.find((item) => item.id === id);
    if (m) {
      updateMotivoParada(id, { ativo: !m.ativo });
    }
  };

  const deleteMotivoParada = (id: string) => {
    persistState({
      ...data,
      motivosParada: data.motivosParada.filter((m) => m.id !== id),
    });
  };

  // LANÇAMENTOS DE PRODUÇÃO
  const addLancamentoProducao = (
    item: Omit<LancamentoProducao, 'id' | 'createdAt' | 'updatedAt' | 'percentualPerda' | 'produtividadeKgHora'>
  ): LancamentoProducao => {
    const now = new Date().toISOString();
    const refugo = Number(item.refugoKg) || 0;
    const perda = Number(item.perdaKg) || 0;
    const bruto = Number(item.quantidadeBrutaKg) || 0;
    const totalDescarte = refugo + perda;
    const percentualPerda = bruto > 0
      ? Number(((totalDescarte / bruto) * 100).toFixed(2))
      : 0;

    const horasTrabalhadas = (Number(item.tempoTrabalhadoMinutos) || 0) / 60;
    const produtividadeKgHora = horasTrabalhadas > 0
      ? Number(((Number(item.quantidadeLiquidaKg) || 0) / horasTrabalhadas).toFixed(2))
      : 0;

    const novoLancamento: LancamentoProducao = {
      ...item,
      refugoKg: refugo,
      perdaKg: perda,
      id: `lanc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      percentualPerda,
      produtividadeKgHora,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    persistState({
      ...data,
      lancamentosProducao: [novoLancamento, ...data.lancamentosProducao],
    });

    return novoLancamento;
  };

  const updateLancamentoProducao = (id: string, item: Partial<LancamentoProducao>) => {
    const now = new Date().toISOString();
    persistState({
      ...data,
      lancamentosProducao: data.lancamentosProducao.map((l) => {
        if (l.id !== id) return l;
        const merged = { ...l, ...item, updatedAt: now };
        
        // Recalcular indicadores derivados caso pesos ou tempos tenham sido alterados
        const refugo = Number(merged.refugoKg) || 0;
        const perda = Number(merged.perdaKg) || 0;
        const bruto = Number(merged.quantidadeBrutaKg) || 0;
        const totalDescarte = refugo + perda;
        const percentualPerda = bruto > 0
          ? Number(((totalDescarte / bruto) * 100).toFixed(2))
          : 0;

        const horasTrabalhadas = (Number(merged.tempoTrabalhadoMinutos) || 0) / 60;
        const produtividadeKgHora = horasTrabalhadas > 0
          ? Number(((Number(merged.quantidadeLiquidaKg) || 0) / horasTrabalhadas).toFixed(2))
          : 0;

        return {
          ...merged,
          refugoKg: refugo,
          perdaKg: perda,
          percentualPerda,
          produtividadeKgHora,
        };
      }),
    });
  };

  const deleteLancamentoProducao = (id: string, softDelete = true) => {
    persistState({
      ...data,
      lancamentosProducao: softDelete
        ? data.lancamentosProducao.map((l) => (l.id === id ? { ...l, isDeleted: true, updatedAt: new Date().toISOString() } : l))
        : data.lancamentosProducao.filter((l) => l.id !== id),
    });
  };

  // LANÇAMENTOS DE PARADA
  const addLancamentoParada = (item: Omit<LancamentoParada, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const novoApontamento: LancamentoParada = {
      ...item,
      id: `par-${Date.now()}`,
      createdAt: now,
    };
    persistState({
      ...data,
      lancamentosParada: [novoApontamento, ...data.lancamentosParada],
    });
  };

  const deleteLancamentoParada = (id: string) => {
    persistState({
      ...data,
      lancamentosParada: data.lancamentosParada.filter((p) => p.id !== id),
    });
  };

  // REGRAS DE PREMIAÇÃO
  const updateRegraPremiacao = (setorId: string, rule: Partial<RegraPremiacao>) => {
    const existing = data.regrasPremiacao.find((r) => r.setorId === setorId);
    let updatedRules: RegraPremiacao[];
    if (existing) {
      updatedRules = data.regrasPremiacao.map((r) =>
        r.setorId === setorId ? { ...r, ...rule, updatedAt: new Date().toISOString() } : r
      );
    } else {
      const newRule: RegraPremiacao = {
        id: `prem-${Date.now()}`,
        setorId,
        metaPerdaPercentual: rule.metaPerdaPercentual ?? 2.0,
        toleranciaMaximaPercentual: rule.toleranciaMaximaPercentual ?? 3.0,
        valorBasePremio: rule.valorBasePremio ?? 400,
        tipoPremio: rule.tipoPremio ?? 'individual',
        ativo: rule.ativo ?? true,
        updatedAt: new Date().toISOString(),
      };
      updatedRules = [...data.regrasPremiacao, newRule];
    }
    persistState({
      ...data,
      regrasPremiacao: updatedRules,
    });
  };

  // UTILITÁRIOS
  const resetToDefaults = async () => {
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
    } catch {
      // continua
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATABASE_DATA));
    }
    setData(INITIAL_DATABASE_DATA);
  };

  const clearProductionData = async () => {
    const cleanedData: DatabaseSchema = {
      ...data,
      lancamentosProducao: [],
      lancamentosParada: [],
      configuracoes: {
        ...data.configuracoes,
        ultimaAtualizacao: new Date().toISOString(),
      },
    };
    await persistState(cleanedData);
  };

  const clearAllData = async () => {
    const emptyData: DatabaseSchema = {
      configuracoes: {
        ...data.configuracoes,
        ultimaAtualizacao: new Date().toISOString(),
      },
      setores: [],
      maquinas: [],
      operadores: [],
      produtos: [],
      turnos: [],
      motivosParada: [],
      regrasPremiacao: [],
      lancamentosProducao: [],
      lancamentosParada: [],
    };
    await persistState(emptyData);
  };

  const exportBackupJSON = (): string => {
    return JSON.stringify(data, null, 2);
  };

  const importBackupJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.setores && parsed.maquinas && parsed.operadores) {
        persistState(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loadDemoData = async () => {
    const { lancamentosProducao, lancamentosParada } = getDemoLancamentos();
    const updatedData: DatabaseSchema = {
      ...data,
      lancamentosProducao: [...lancamentosProducao],
      lancamentosParada: [...lancamentosParada],
    };
    await persistState(updatedData);
  };

  return (
    <ProductionContext.Provider
      value={{
        data,
        loading,
        isSaving,
        saveStatusMessage,
        supabaseInfo,
        checkSupabaseConnection,
        forceSyncToSupabase,
        clearProductionData,
        clearAllData,
        addSetor,
        updateSetor,
        toggleSetorAtivo,
        deleteSetor,
        addMaquina,
        updateMaquina,
        toggleMaquinaAtivo,
        deleteMaquina,
        addOperador,
        updateOperador,
        toggleOperadorAtivo,
        deleteOperador,
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
        addLancamentoProducao,
        updateLancamentoProducao,
        deleteLancamentoProducao,
        addLancamentoParada,
        deleteLancamentoParada,
        updateRegraPremiacao,
        resetToDefaults,
        exportBackupJSON,
        importBackupJSON,
        loadDemoData,
        refreshData,
      }}
    >
      {children}
    </ProductionContext.Provider>
  );
}

export function useProductionDB() {
  const context = useContext(ProductionContext);
  if (!context) {
    throw new Error('useProductionDB deve ser utilizado dentro de um ProductionProvider');
  }
  return context;
}
