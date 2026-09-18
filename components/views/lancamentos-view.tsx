'use client';

import React, { useState, useMemo } from 'react';
import { useProductionDB } from '@/lib/db-context';
import { LancamentoProducao } from '@/lib/types';
import { SUPABASE_SQL_SETUP } from '@/lib/supabase';
import { parseLancamentosFile, downloadImportTemplate, ImportLancamentosResult } from '@/lib/import-lancamentos';
import { formatYMDToBR } from '@/lib/production-analytics';
import { RtlDecimalInput } from '@/components/ui/rtl-decimal-input';
import {
  ClipboardPenLine,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  AlertTriangle,
  Scale,
  Calendar,
  Layers,
  Printer,
  Scissors,
  Cpu,
  User,
  Eye,
  Edit3,
  Copy,
  Filter,
  X,
  ArrowLeft,
  Search,
  Building2,
  FileText,
  RotateCcw,
  Percent,
  TrendingUp,
  Factory,
  Database,
  FileSpreadsheet,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';

type ViewMode = 'list' | 'select_sector' | 'form';
type FormMode = 'create' | 'edit' | 'duplicate';

const PAGINA_TAMANHO = 20;

interface SessionMemory {
  data: string;
  turnoId: string;
  maquinaIdPorSetor: Record<string, string>;
  operadorIdPorSetor: Record<string, string>;
}

// Helpers para cálculo automático de jornada entre horários
function calcularMinutosEntreHorarios(horaInicio: string, horaFim: string): number {
  if (!horaInicio || !horaFim) return 0;
  const matchIni = horaInicio.match(/^(\d{1,2}):(\d{2})$/);
  const matchFim = horaFim.match(/^(\d{1,2}):(\d{2})$/);
  if (!matchIni || !matchFim) return 0;

  const hIni = parseInt(matchIni[1], 10);
  const mIni = parseInt(matchIni[2], 10);
  const hFim = parseInt(matchFim[1], 10);
  const mFim = parseInt(matchFim[2], 10);

  if (isNaN(hIni) || isNaN(mIni) || isNaN(hFim) || isNaN(mFim)) return 0;

  const iniTotal = hIni * 60 + mIni;
  let fimTotal = hFim * 60 + mFim;

  if (fimTotal < iniTotal) {
    // Cruzamento de meia-noite (ex: 22:00 até 06:00 do dia seguinte)
    fimTotal += 24 * 60;
  }

  return Math.max(0, fimTotal - iniTotal);
}

function formatarTempoMinutos(minutos: number): string {
  if (!minutos || minutos <= 0) return '0 min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

export function LancamentosView({ navResetKey = 0 }: { navResetKey?: number }) {
  const {
    data,
    addLancamentoProducao,
    updateLancamentoProducao,
    deleteLancamentoProducao,
    deleteLancamentosProducao,
    addLancamentoProducaoComParada,
    updateLancamentoProducaoComParada,
    importLancamentos,
    checkSupabaseConnection,
    forceSyncToSupabase,
  } = useProductionDB();

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportLancamentosResult | null>(null);

  // Modo de navegação no módulo de produção
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [selectedSetorId, setSelectedSetorId] = useState<string>('set-ext');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modais auxiliares
  const [viewingItem, setViewingItem] = useState<LancamentoProducao | null>(null);
  const [deletingItem, setDeletingItem] = useState<LancamentoProducao | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Seleção em lote no histórico
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingSubmit, setPendingSubmit] = useState<boolean>(false);
  const [showAtypicalWarning, setShowAtypicalWarning] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<{ id: string; op: string; setorId: string } | null>(null);

  // Ao clicar no menu "Lançamentos" de novo, volta para a página inicial (histórico/lista)
  React.useEffect(() => {
    if (navResetKey > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode('list');
      setSaveBanner(null);
    }
  }, [navResetKey]);

  // Memória inteligente de sessão (Requisito 15)
  const [sessionMemory, setSessionMemory] = useState<SessionMemory>(() => ({
    data: new Date().toISOString().split('T')[0],
    turnoId: data.turnos[0]?.id || '',
    maquinaIdPorSetor: {},
    operadorIdPorSetor: {},
  }));

  // Estado do formulário de produção
  const [formData, setFormData] = useState(() => {
    const initialTurno = data.turnos[0];
    const initialHoraInicio = initialTurno?.horaInicio || '06:00';
    const initialHoraFim = initialTurno?.horaFim || '14:20';
    const initialMinutos = calcularMinutosEntreHorarios(initialHoraInicio, initialHoraFim);

    return {
      data: new Date().toISOString().split('T')[0],
      turnoId: initialTurno?.id || '',
      maquinaId: '',
      operadorId: '',
      produtoId: '',
      ordemProducao: '',
      cliente: '', // Específico de Impressão
      metragemLinearMetros: 0, // Específico de Impressão
      quantidadeCaixas: 0, // Específico de Corte e Solda
      unidadesPorCaixa: 3500, // Específico de Corte e Solda (Padrão 3500 un/cx)
      quantidadeUnidades: 0, // Específico de Corte e Solda (milheiros / sacos)
      quantidadeBrutaKg: 0,
      quantidadeLiquidaKg: 0,
      refugoKg: 0,
      perdaKg: 0,
      horaInicio: initialHoraInicio,
      horaFim: initialHoraFim,
      tempoTrabalhadoMinutos: initialMinutos,
      tempoParadoMinutos: 0,
      motivoParadaId: '',
      observacoes: '',
    };
  });

  // Filtros da tabela de histórico
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    setorId: '',
    maquinaId: '',
    operadorId: '',
    produtoId: '',
    turnoId: '',
    buscaTexto: '',
  });

  // Paginação da tabela de histórico
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Helpers de nomes
  const getSetor = (id: string) => data.setores.find((s) => s.id === id);
  const getSetorName = (id: string) => getSetor(id)?.nome || id;
  const getMaquinaName = (id: string) => data.maquinas.find((m) => m.id === id)?.nome || id;
  const getOperadorName = (id: string) => data.operadores.find((op) => op.id === id)?.nome || id;
  const getProdutoName = (id: string) => data.produtos.find((p) => p.id === id)?.descricao || id;
  const getTurnoName = (id: string) => data.turnos.find((t) => t.id === id)?.nome || id;
  const getMotivoName = (id: string) => data.motivosParada.find((m) => m.id === id)?.descricao || id;

  // Filtragem de listas para o setor ativo no formulário
  const maquinasDoSetor = useMemo(() => {
    const list = data.maquinas.filter((m) => m.ativo && m.setorId === selectedSetorId);
    return list.length > 0 ? list : data.maquinas.filter((m) => m.ativo);
  }, [data.maquinas, selectedSetorId]);

  const operadoresDisponiveis = useMemo(
    () => data.operadores.filter((op) => op.ativo),
    [data.operadores]
  );

  const produtosDisponiveis = useMemo(
    () => data.produtos.filter((p) => p.ativo),
    [data.produtos]
  );

  // Iniciar novo lançamento: sempre direciona para a tela de escolha do setor "Qual setor deseja lançar?"
  const handleStartNovoLancamento = () => {
    setSaveBanner(null);
    setViewMode('select_sector');
  };

  // Importação em lote de lançamentos via planilha Excel/CSV
  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const parsed = await parseLancamentosFile(file);
      if (parsed.rows.length === 0) {
        setImportResult({
          total: 0,
          imported: 0,
          skipped: 0,
          created: { setores: 0, maquinas: 0, operadores: 0, produtos: 0, turnos: 0, motivos: 0 },
          errors: parsed.errors,
        });
        return;
      }
      const result = importLancamentos(parsed.rows);
      setImportResult({
        ...result,
        errors: [...parsed.errors, ...result.errors],
      });
      setViewMode('list');
    } catch (err) {
      setImportResult({
        total: 0,
        imported: 0,
        skipped: 0,
        created: { setores: 0, maquinas: 0, operadores: 0, produtos: 0, turnos: 0, motivos: 0 },
        errors: [`Não foi possível ler o arquivo: ${(err as Error).message}`],
      });
    } finally {
      setImporting(false);
    }
  };

  // Selecionar o setor e abrir o formulário com dados inteligentes (Requisitos 1, 14, 15)
  const handleSelectSetor = (setorId: string) => {
    setSelectedSetorId(setorId);
    setFormMode('create');
    setEditingId(null);
    setSaveBanner(null);

    const maqs = data.maquinas.filter((m) => m.ativo && m.setorId === setorId);
    const availableMaqs = maqs.length > 0 ? maqs : data.maquinas.filter((m) => m.ativo);
    const availableOps = data.operadores.filter((op) => op.ativo);
    const availableProds = data.produtos.filter((p) => p.ativo);

    // Reaproveita da sessão se existir (Preenchimento Inteligente)
    const rememberedMaq = sessionMemory.maquinaIdPorSetor[setorId];
    const defaultMaq = availableMaqs.some((m) => m.id === rememberedMaq) ? rememberedMaq : (availableMaqs[0]?.id || '');

    const rememberedOp = sessionMemory.operadorIdPorSetor[setorId];
    const defaultOp = availableOps.some((o) => o.id === rememberedOp) ? rememberedOp : (availableOps[0]?.id || '');

    const activeTurno = data.turnos.find((t) => t.id === (sessionMemory.turnoId || data.turnos[0]?.id));
    const hIni = activeTurno?.horaInicio || '06:00';
    const hFim = activeTurno?.horaFim || '14:20';
    const tempoMinutos = calcularMinutosEntreHorarios(hIni, hFim);

    setFormData({
      data: sessionMemory.data || new Date().toISOString().split('T')[0],
      turnoId: sessionMemory.turnoId || data.turnos[0]?.id || '',
      maquinaId: defaultMaq,
      operadorId: defaultOp,
      produtoId: availableProds[0]?.id || '',
      ordemProducao: '',
      cliente: '',
      metragemLinearMetros: 0,
      quantidadeCaixas: 0,
      unidadesPorCaixa: 3500,
      quantidadeUnidades: 0,
      quantidadeBrutaKg: 0,
      quantidadeLiquidaKg: 0,
      refugoKg: 0,
      perdaKg: 0,
      horaInicio: hIni,
      horaFim: hFim,
      tempoTrabalhadoMinutos: tempoMinutos,
      tempoParadoMinutos: 0,
      motivoParadaId: data.motivosParada[0]?.id || '',
      observacoes: '',
    });

    setViewMode('form');
  };

  // Handlers para cálculo automático de horários
  const handleTurnoChange = (novoTurnoId: string) => {
    const turnoObj = data.turnos.find((t) => t.id === novoTurnoId);
    if (turnoObj) {
      const hIni = turnoObj.horaInicio || formData.horaInicio;
      const hFim = turnoObj.horaFim || formData.horaFim;
      const mins = calcularMinutosEntreHorarios(hIni, hFim);
      setFormData((prev) => ({
        ...prev,
        turnoId: novoTurnoId,
        horaInicio: hIni,
        horaFim: hFim,
        tempoTrabalhadoMinutos: mins,
      }));
    } else {
      setFormData((prev) => ({ ...prev, turnoId: novoTurnoId }));
    }
  };

  const handleHoraInicioChange = (novaHoraInicio: string) => {
    const mins = calcularMinutosEntreHorarios(novaHoraInicio, formData.horaFim);
    setFormData((prev) => ({
      ...prev,
      horaInicio: novaHoraInicio,
      tempoTrabalhadoMinutos: mins,
    }));
  };

  const handleHoraFimChange = (novaHoraFim: string) => {
    const mins = calcularMinutosEntreHorarios(formData.horaInicio, novaHoraFim);
    setFormData((prev) => ({
      ...prev,
      horaFim: novaHoraFim,
      tempoTrabalhadoMinutos: mins,
    }));
  };

  const isTurnoNoturno = useMemo(() => {
    if (!formData.horaInicio || !formData.horaFim) return false;
    const matchIni = formData.horaInicio.match(/^(\d{1,2}):(\d{2})$/);
    const matchFim = formData.horaFim.match(/^(\d{1,2}):(\d{2})$/);
    if (!matchIni || !matchFim) return false;
    const ini = parseInt(matchIni[1], 10) * 60 + parseInt(matchIni[2], 10);
    const fim = parseInt(matchFim[1], 10) * 60 + parseInt(matchFim[2], 10);
    return fim < ini;
  }, [formData.horaInicio, formData.horaFim]);

  // Handlers independentes do bloco de pesos (RTL 0,00)
  // Padronizado para todos os setores: Produção Boa, Refugo e Perda são digitados
  // e a Matéria-Prima Alimentada é sempre calculada (Produção Boa + Refugo + Perda).
  const handleRefugoChange = (refugo: number) => {
    setFormData((prev) => ({ ...prev, refugoKg: refugo }));
  };

  const handlePerdaChange = (perda: number) => {
    setFormData((prev) => ({ ...prev, perdaKg: perda }));
  };

  const handleLiquidoChange = (liquido: number) => {
    setFormData((prev) => ({
      ...prev,
      quantidadeLiquidaKg: liquido,
    }));
  };

  // Cálculos dinâmicos em tempo real do formulário ativo (Requisito 6 e 17)
  const calcLiquido = Number(formData.quantidadeLiquidaKg) || 0;
  const calcRefugo = Number(formData.refugoKg) || 0;
  const calcPerda = Number(formData.perdaKg) || 0;
  const calcTotalDescarte = Number((calcRefugo + calcPerda).toFixed(2));

  // Matéria-Prima Alimentada é sempre calculada (Produção Boa + Perda), padrão Corte e Solda
  const calcBruto = Number((calcLiquido + calcPerda).toFixed(2));

  const calcTotalDescartePercent = calcBruto > 0 ? ((calcTotalDescarte / calcBruto) * 100).toFixed(2) : '0.00';

  const calcHorasTrabalhadas = (Number(formData.tempoTrabalhadoMinutos) || 0) / 60;
  const calcProdutividadeKgH = calcHorasTrabalhadas > 0 ? (calcLiquido / calcHorasTrabalhadas).toFixed(1) : '0.0';

  // Corte e Solda: caixas derivadas da regra 3.500 un/cx (exibição apenas no Resumo em Tempo Real)
  const calcCaixasCorteSolda =
    Number(formData.quantidadeCaixas) > 0
      ? Number(formData.quantidadeCaixas)
      : Number(formData.quantidadeUnidades) > 0
      ? Number((Number(formData.quantidadeUnidades) / (Number(formData.unidadesPorCaixa) || 3500)).toFixed(1))
      : 0;

  // Validação dos dados antes do salvamento (Requisito 8)
  const validateForm = (): string | null => {
    if (!formData.data) return 'A Data do lançamento é obrigatória.';
    if (!formData.turnoId) return 'O Turno de trabalho é obrigatório.';
    if (!formData.maquinaId) return 'A Máquina de produção é obrigatória.';
    if (!formData.operadorId) return 'O Operador responsável é obrigatório.';
    if (!formData.produtoId) return 'O Produto fabricado é obrigatório.';
    if (!formData.horaInicio || !formData.horaFim) {
      return 'Informe o Horário de Início e o Horário de Fim da jornada de trabalho.';
    }
    if (formData.tempoTrabalhadoMinutos <= 0) {
      return 'O Horário de Fim deve ser diferente do Horário de Início para calcular uma duração de trabalho válida (> 0 minutos).';
    }

    // Validação flexível por setor (padronizada: Produção Boa/Perda e/ou Caixas)
    const hasKg = calcBruto > 0;
    const hasQtd = (Number(formData.quantidadeUnidades) || 0) > 0 || (Number(formData.quantidadeCaixas) || 0) > 0;
    if (!hasKg && !hasQtd) {
      return 'Informe a Produção Boa (kg) e/ou a Quantidade de Caixas para calcular a Matéria-Prima Alimentada.';
    }

    if (calcBruto > 0 && calcTotalDescarte > calcBruto) {
      return `A soma de Refugo (${calcRefugo.toFixed(2)} kg) e Perda (${calcPerda.toFixed(2)} kg) totaliza ${calcTotalDescarte.toFixed(2)} kg, ultrapassando a Matéria-Prima Alimentada de ${calcBruto.toFixed(2)} kg!`;
    }
    if (Number(formData.tempoParadoMinutos) > 0 && !formData.motivoParadaId) {
      return 'Informe o Motivo da Parada para o tempo parado registrado.';
    }
    return null;
  };

  // Submissão com verificação de valores atípicos (Requisito 8 e 9)
  const handleSubmitProducao = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    // Alerta de valores atípicos (aviso suave de confirmação)
    const descartePct = Number(calcTotalDescartePercent);
    if (calcBruto > 5000) {
      setShowAtypicalWarning(
        `A Matéria-Prima Alimentada calculada (${calcBruto.toLocaleString('pt-BR')} kg) parece muito acima do normal para um único turno de máquina.`
      );
      return;
    }
    if (descartePct > 25) {
      setShowAtypicalWarning(`O índice de descarte calculado (${descartePct.toFixed(2)}%) está excepcionalmente alto (> 25%).`);
      return;
    }
    if (Number(formData.tempoParadoMinutos) > 480) {
      setShowAtypicalWarning(`O tempo parado (${formData.tempoParadoMinutos} min) excede a jornada padrão normal de 8 horas.`);
      return;
    }

    executeSave();
  };

  const executeSave = () => {
    setShowAtypicalWarning(null);

    const payload = {
      data: formData.data,
      turnoId: formData.turnoId,
      setorId: selectedSetorId,
      maquinaId: formData.maquinaId,
      operadorId: formData.operadorId,
      produtoId: formData.produtoId,
      ordemProducao: formData.ordemProducao.trim() || `OP-${Date.now().toString().slice(-4)}`,
      cliente: formData.cliente.trim() || undefined,
      metragemLinearMetros: Number(formData.metragemLinearMetros) || undefined,
      quantidadeCaixas: Number(formData.quantidadeCaixas) || undefined,
      unidadesPorCaixa: Number(formData.unidadesPorCaixa) || 3500,
      quantidadeUnidades: Number(formData.quantidadeUnidades) || undefined,
      quantidadeBrutaKg: calcBruto,
      quantidadeLiquidaKg: calcLiquido,
      refugoKg: calcRefugo,
      perdaKg: calcPerda,
      horaInicio: formData.horaInicio || undefined,
      horaFim: formData.horaFim || undefined,
      tempoTrabalhadoMinutos: Number(formData.tempoTrabalhadoMinutos) || 0,
      tempoParadoMinutos: Number(formData.tempoParadoMinutos) || 0,
      motivoParadaId: Number(formData.tempoParadoMinutos) > 0 ? formData.motivoParadaId : undefined,
      status: 'concluido' as const,
      observacoes: formData.observacoes.trim() || undefined,
    };

    let savedId = '';
    let opName = payload.ordemProducao;

    const paradaPayload = (payload.tempoParadoMinutos > 0 && payload.motivoParadaId)
      ? {
          data: payload.data,
          turnoId: payload.turnoId,
          maquinaId: payload.maquinaId,
          operadorId: payload.operadorId,
          motivoParadaId: payload.motivoParadaId,
          tempoMinutos: payload.tempoParadoMinutos,
          observacoes: payload.observacoes ? `Referente à OP ${opName}: ${payload.observacoes}` : `Parada na OP ${opName}`,
        }
      : null;

    if (formMode === 'edit' && editingId) {
      updateLancamentoProducaoComParada(editingId, payload, paradaPayload);
      savedId = editingId;
    } else {
      const created = addLancamentoProducaoComParada(payload, paradaPayload);
      savedId = created.id;
    }

    // Atualiza memória de sessão (Requisito 15)
    setSessionMemory((prev) => ({
      ...prev,
      data: formData.data,
      turnoId: formData.turnoId,
      maquinaIdPorSetor: {
        ...prev.maquinaIdPorSetor,
        [selectedSetorId]: formData.maquinaId,
      },
      operadorIdPorSetor: {
        ...prev.operadorIdPorSetor,
        [selectedSetorId]: formData.operadorId,
      },
    }));

    // Exibe banner de confirmação com opções: NOVO LANÇAMENTO ou VER LANÇAMENTO (Requisito 9)
    setSaveBanner({
      id: savedId,
      op: opName,
      setorId: selectedSetorId,
    });

    // Retorna para a lista com o banner de sucesso para confirmação visual imediata
    setViewMode('list');
    setEditingId(null);
  };

  // Ação "Novo Lançamento" após salvar (mantém a máquina e operador da sessão)
  const handleResetForNextLancamento = () => {
    setSaveBanner(null);
    setFormMode('create');
    setEditingId(null);

    const activeTurno = data.turnos.find((t) => t.id === (sessionMemory.turnoId || data.turnos[0]?.id));
    const hIni = activeTurno?.horaInicio || '06:00';
    const hFim = activeTurno?.horaFim || '14:20';
    const tempoMinutos = calcularMinutosEntreHorarios(hIni, hFim);

    setFormData((prev) => ({
      ...prev,
      ordemProducao: '',
      cliente: '',
      metragemLinearMetros: 0,
      quantidadeCaixas: 0,
      unidadesPorCaixa: 3500,
      quantidadeUnidades: 0,
      quantidadeBrutaKg: 0,
      quantidadeLiquidaKg: 0,
      refugoKg: 0,
      perdaKg: 0,
      horaInicio: hIni,
      horaFim: hFim,
      tempoTrabalhadoMinutos: tempoMinutos,
      tempoParadoMinutos: 0,
      observacoes: '',
    }));
    setViewMode('form');
  };

  // Ação "Duplicar" a partir da tabela ou após salvar (Requisito 11)
  const handleDuplicarLancamento = (item: LancamentoProducao) => {
    setSelectedSetorId(item.setorId);
    setFormMode('duplicate');
    setEditingId(null);
    setSaveBanner(null);

    const turnoObj = data.turnos.find((t) => t.id === item.turnoId);
    const hIni = item.horaInicio || turnoObj?.horaInicio || '06:00';
    const hFim = item.horaFim || turnoObj?.horaFim || '14:20';
    const tempoMin = item.tempoTrabalhadoMinutos || calcularMinutosEntreHorarios(hIni, hFim);

    const caixas = item.quantidadeCaixas ?? (item.quantidadeUnidades ? Math.round(item.quantidadeUnidades / (item.unidadesPorCaixa || 3500)) : 0);

    setFormData({
      data: item.data,
      turnoId: item.turnoId,
      maquinaId: item.maquinaId,
      operadorId: item.operadorId,
      produtoId: item.produtoId,
      ordemProducao: item.ordemProducao ? `${item.ordemProducao}-COPIA` : '',
      cliente: item.cliente || '',
      metragemLinearMetros: item.metragemLinearMetros || 0,
      quantidadeCaixas: caixas,
      unidadesPorCaixa: item.unidadesPorCaixa || 3500,
      quantidadeUnidades: item.quantidadeUnidades || 0,
      quantidadeBrutaKg: item.quantidadeBrutaKg,
      quantidadeLiquidaKg: item.quantidadeLiquidaKg,
      refugoKg: item.refugoKg || 0,
      perdaKg: item.perdaKg || 0,
      horaInicio: hIni,
      horaFim: hFim,
      tempoTrabalhadoMinutos: tempoMin,
      tempoParadoMinutos: item.tempoParadoMinutos || 0,
      motivoParadaId: item.motivoParadaId || (data.motivosParada[0]?.id || ''),
      observacoes: item.observacoes || '',
    });

    setViewMode('form');
  };

  // Ação "Editar" a partir da tabela (Requisito 12)
  const handleEditarLancamento = (item: LancamentoProducao) => {
    setSelectedSetorId(item.setorId);
    setFormMode('edit');
    setEditingId(item.id);
    setSaveBanner(null);

    const turnoObj = data.turnos.find((t) => t.id === item.turnoId);
    const hIni = item.horaInicio || turnoObj?.horaInicio || '06:00';
    const hFim = item.horaFim || turnoObj?.horaFim || '14:20';
    const tempoMin = item.tempoTrabalhadoMinutos || calcularMinutosEntreHorarios(hIni, hFim);

    const caixas = item.quantidadeCaixas ?? (item.quantidadeUnidades ? Math.round(item.quantidadeUnidades / (item.unidadesPorCaixa || 3500)) : 0);

    setFormData({
      data: item.data,
      turnoId: item.turnoId,
      maquinaId: item.maquinaId,
      operadorId: item.operadorId,
      produtoId: item.produtoId,
      ordemProducao: item.ordemProducao || '',
      cliente: item.cliente || '',
      metragemLinearMetros: item.metragemLinearMetros || 0,
      quantidadeCaixas: caixas,
      unidadesPorCaixa: item.unidadesPorCaixa || 3500,
      quantidadeUnidades: item.quantidadeUnidades || 0,
      quantidadeBrutaKg: item.quantidadeBrutaKg,
      quantidadeLiquidaKg: item.quantidadeLiquidaKg,
      refugoKg: item.refugoKg || 0,
      perdaKg: item.perdaKg || 0,
      horaInicio: hIni,
      horaFim: hFim,
      tempoTrabalhadoMinutos: tempoMin,
      tempoParadoMinutos: item.tempoParadoMinutos || 0,
      motivoParadaId: item.motivoParadaId || (data.motivosParada[0]?.id || ''),
      observacoes: item.observacoes || '',
    });

    setViewMode('form');
  };

  // Exclusão com confirmação (Requisito 13)
  const confirmDelete = () => {
    if (!deletingItem) return;
    deleteLancamentoProducao(deletingItem.id, true);
    setDeletingItem(null);
  };

  // Navegação ergonômica solicitada: ENTER avança para o próximo campo e NÃO salva o lançamento!
  // O salvamento é exclusivo para o clique no botão "Salvar Lançamento".
  const handleKeyDownAvancarCampo = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Se for textarea, permite quebra de linha normal com Enter
      if (target && target.tagName.toLowerCase() === 'textarea') {
        return;
      }

      // Impede o envio acidental padrão de formulários ao teclar Enter
      e.preventDefault();

      // Coleta todos os campos interativos do formulário
      const form = e.currentTarget;
      const elements = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])'
        )
      ).filter((el) => el.offsetParent !== null && !el.hasAttribute('disabled'));

      const currentIndex = elements.indexOf(target);
      if (currentIndex >= 0 && currentIndex < elements.length - 1) {
        const nextElement = elements[currentIndex + 1];
        nextElement.focus();
        if (nextElement instanceof HTMLInputElement && (nextElement.type === 'text' || nextElement.type === 'number')) {
          nextElement.select?.();
        }
      }
    }
  };

  // Filtragem do histórico (Requisito 10)
  const lancamentosFiltrados = useMemo(() => {
    return data.lancamentosProducao
      .filter((l) => !l.isDeleted)
      .filter((l) => {
        if (filters.setorId && l.setorId !== filters.setorId) return false;
        if (filters.maquinaId && l.maquinaId !== filters.maquinaId) return false;
        if (filters.operadorId && l.operadorId !== filters.operadorId) return false;
        if (filters.produtoId && l.produtoId !== filters.produtoId) return false;
        if (filters.turnoId && l.turnoId !== filters.turnoId) return false;
        if (filters.dataInicio && l.data < filters.dataInicio) return false;
        if (filters.dataFim && l.data > filters.dataFim) return false;
        if (filters.buscaTexto) {
          const q = filters.buscaTexto.toLowerCase();
          const op = (l.ordemProducao || '').toLowerCase();
          const obs = (l.observacoes || '').toLowerCase();
          const cli = (l.cliente || '').toLowerCase();
          if (!op.includes(q) && !obs.includes(q) && !cli.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.data !== b.data) return a.data > b.data ? -1 : 1;
        return a.createdAt > b.createdAt ? -1 : 1;
      });
  }, [data.lancamentosProducao, filters]);

  // Paginação: sempre na primeira página o lançamento mais recente
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaginaAtual(1);
  }, [filters]);

  const totalPaginas = Math.max(1, Math.ceil(lancamentosFiltrados.length / PAGINA_TAMANHO));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const itensPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * PAGINA_TAMANHO;
    return lancamentosFiltrados.slice(inicio, inicio + PAGINA_TAMANHO);
  }, [lancamentosFiltrados, paginaSegura]);

  // ---- SELEÇÃO EM LOTE ----
  const selectedIdsArray = Array.from(selectedIds);
  const visibleIdsArray = itensPagina.map((l) => l.id);
  const allVisibleSelected = visibleIdsArray.length > 0 && visibleIdsArray.every((id) => selectedIds.has(id));
  const selectedBulkItems = lancamentosFiltrados.filter((l) => selectedIds.has(l.id));

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIdsArray.forEach((id) => next.delete(id));
      } else {
        visibleIdsArray.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const confirmBulkDelete = () => {
    if (selectedIdsArray.length === 0) return;
    deleteLancamentosProducao(selectedIdsArray, true);
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  // CÁLCULOS CONSOLIDADOS CORRETOS (Requisito 7: NUNCA média simples de percentuais!)
  const consolidados = useMemo(() => {
    const totalBruto = lancamentosFiltrados.reduce((acc, l) => acc + (l.quantidadeBrutaKg || 0), 0);
    const totalLiquido = lancamentosFiltrados.reduce((acc, l) => acc + (l.quantidadeLiquidaKg || 0), 0);
    const totalRefugo = lancamentosFiltrados.reduce((acc, l) => acc + (l.refugoKg || 0), 0);
    const totalPerda = lancamentosFiltrados.reduce((acc, l) => acc + (l.perdaKg || 0), 0);
    const totalDescarte = totalRefugo + totalPerda;
    const taxaDescarteConsolidada = totalBruto > 0 ? ((totalDescarte / totalBruto) * 100).toFixed(2) : '0.00';
    const totalHoras = lancamentosFiltrados.reduce((acc, l) => acc + ((l.tempoTrabalhadoMinutos || 0) / 60), 0);
    const produtividadeMedia = totalHoras > 0 ? (totalLiquido / totalHoras).toFixed(1) : '0.0';

    return {
      totalBruto,
      totalLiquido,
      totalRefugo,
      totalPerda,
      totalDescarte,
      taxaDescarteConsolidada,
      totalHoras,
      produtividadeMedia,
      count: lancamentosFiltrados.length,
    };
  }, [lancamentosFiltrados]);

  // Metas do setor atual
  const regraSetorAtual = data.regrasPremiacao.find((r) => r.setorId === selectedSetorId);
  const metaPerdaSetor = regraSetorAtual?.metaPerdaPercentual || data.configuracoes.metaGeralPerda || 2.5;

  return (
    <div className="space-y-6">
      {/* MODAL DE ATIVAÇÃO DO SUPABASE */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">Ativar Sincronização Supabase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Para habilitar o salvamento em nuvem na Vercel e garantir que nenhum lançamento seja perdido:
            </p>

            <ol className="text-xs text-slate-700 space-y-1.5 list-decimal pl-4 font-medium">
              <li>Abra o painel do seu projeto no Supabase (<strong>supabase.com</strong>).</li>
              <li>Acesse a aba <strong>SQL Editor</strong> no menu lateral esquerdo.</li>
              <li>Clique em <strong>New query</strong>, cole o código abaixo e clique em <strong>Run</strong>:</li>
            </ol>

            <div className="relative">
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
                {SUPABASE_SQL_SETUP}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="absolute top-2 right-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await checkSupabaseConnection();
                  await forceSyncToSupabase();
                  setShowSqlModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Já executei no Supabase! Testar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">Importar Lançamentos (Planilha)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                disabled={importing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Selecione um arquivo <strong>Excel (.xlsx/.xls)</strong> ou <strong>CSV</strong> com os lançamentos.
              Colunas simples (podem ter outro nome — o sistema identifica por equivalência):
              <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">Data, Máquina, Operador, Produto,
              Perda (kg), Refugo (kg), Produção Boa (kg), Caixas Fechadas, Hora Início, Hora Fim,
              Tempo Parado (min), Motivo da Parada</code>.
            </p>
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 font-medium">
              Dica: na coluna <strong>Máquina</strong> você pode digitar só a palavra-chave do equipamento
              — ex.: <strong>Impressora</strong>, <strong>Extrusora</strong>, <strong>Corte 2</strong> —
              e o sistema identifica/reconhece automaticamente as máquinas por essas palavras.
            </p>

            {/* Baixar modelo */}
            <button
              type="button"
              onClick={downloadImportTemplate}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl border border-indigo-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar modelo em CSV (com 1 exemplo)
            </button>

            {/* Área de arquivo */}
            <label className={`block rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${importing ? 'opacity-60 pointer-events-none' : 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/40'}`}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = '';
                }}
              />
              <Upload className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {importing ? 'Processando importação...' : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Suporta .xlsx, .xls e .csv (vírgula ou ponto-e-vírgula, ponto ou vírgula decimal)
              </p>
            </label>

            {/* Estado de processamento */}
            {importing && (
              <div className="flex items-center gap-3 text-sm font-bold text-emerald-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                Lendo a planilha e gravando lançamentos...
              </div>
            )}

            {/* Resultado da importação */}
            {!importing && importResult && (
              <div className="space-y-3">
                <div
                  className={`rounded-2xl p-4 border ${
                    importResult.imported > 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <h4 className={`text-sm font-bold ${importResult.imported > 0 ? 'text-emerald-950' : 'text-amber-950'}`}>
                    {importResult.imported > 0
                      ? `${importResult.imported} de ${importResult.total} lançamentos importados!`
                      : 'Nenhum lançamento importado'}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs text-slate-700">
                    <div className="bg-white/70 rounded-lg px-3 py-2">
                      <span className="block font-bold text-slate-900">Setores criados</span>
                      {importResult.created.setores}
                    </div>
                    <div className="bg-white/70 rounded-lg px-3 py-2">
                      <span className="block font-bold text-slate-900">Máquinas criadas</span>
                      {importResult.created.maquinas}
                    </div>
                    <div className="bg-white/70 rounded-lg px-3 py-2">
                      <span className="block font-bold text-slate-900">Operadores criados</span>
                      {importResult.created.operadores}
                    </div>
                    <div className="bg-white/70 rounded-lg px-3 py-2">
                      <span className="block font-bold text-slate-900">Produtos criados</span>
                      {importResult.created.produtos}
                    </div>
                    <div className="bg-white/70 rounded-lg px-3 py-2">
                      <span className="block font-bold text-slate-900">Turnos criados</span>
                      {importResult.created.turnos}
                    </div>
                    <div className="bg-white/70 rounded-lg px-3 py-2">
                      <span className="block font-bold text-slate-900">Motivos de parada criados</span>
                      {importResult.created.motivos}
                    </div>
                  </div>
                  {importResult.skipped > 0 && (
                    <p className="text-xs font-semibold text-amber-700 mt-3">
                      {importResult.skipped} linha(s) ignorada(s) por erros.
                    </p>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-red-900 mb-2">Problemas encontrados:</h4>
                    <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto font-medium">
                      {importResult.errors.slice(0, 50).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {importResult.errors.length > 50 && (
                        <li>... e mais {importResult.errors.length - 50} erro(s).</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                disabled={importing}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO DE PRODUÇÃO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5 text-slate-900">
          <ClipboardPenLine className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Lançamentos de Produção</h1>
        </div>

        {/* BOTÃO DESTACADO: NOVO LANÇAMENTO (Requisito 1) */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
              title="Importar vários lançamentos de uma planilha Excel (.xlsx/.xls) ou CSV"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>IMPORTAR PLANILHA</span>
            </button>
            <button
              type="button"
              onClick={handleStartNovoLancamento}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="w-5 h-5" />
              <span>NOVO LANÇAMENTO</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* PAINEL: PRODUÇÃO */}
      {/* ======================================================== */}
      <div className="space-y-6">
          {/* BANNER DE SUCESSO APÓS SALVAR COM AÇÕES IMEDIATAS (Requisito 9) */}
          {saveBanner && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Lançamento salvo com sucesso.</h4>
                  <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                    Ordem de Produção <strong className="font-mono font-bold text-emerald-950">{saveBanner.op}</strong> registrada no setor {getSetorName(saveBanner.setorId)}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleStartNovoLancamento}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>NOVO LANÇAMENTO</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveBanner(null);
                    setViewMode('list');
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>VER LANÇAMENTO</span>
                </button>
              </div>
            </div>
          )}

          {/* 1. TELA DE SELEÇÃO DE SETOR (CARDS GRANDES - Requisito 1) */}
          {viewMode === 'select_sector' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Qual setor deseja lançar?</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Selecione a área produtiva para abrir o formulário especializado com máquinas e matérias-primas filtradas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para Histórico</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* CARD EXTRUSORA */}
                <button
                  type="button"
                  onClick={() => handleSelectSetor('set-ext')}
                  className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 bg-white hover:bg-indigo-50/40 text-left transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-4">
                      <Layers className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-700 tracking-tight">
                      EXTRUSORA
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Transformação de resinas termoplásticas (PEBD, PEAD, PP) em bobinas e filmes tubulares.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-700">
                    <span>Peso Bruto • Aparas/Borras • kg/h</span>
                    <span>→</span>
                  </div>
                </button>

                {/* CARD IMPRESSÃO */}
                <button
                  type="button"
                  onClick={() => handleSelectSetor('set-imp')}
                  className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 bg-white hover:bg-indigo-50/40 text-left transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-4">
                      <Printer className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-700 tracking-tight">
                      IMPRESSÃO
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Flexografia e aplicação de tintas, controle por cliente, metros lineares e perdas de acerto de clichê.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-700">
                    <span>Bobinas • Clichês • Metragem</span>
                    <span>→</span>
                  </div>
                </button>

                {/* CARD CORTE E SOLDA */}
                <button
                  type="button"
                  onClick={() => handleSelectSetor('set-cs')}
                  className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 bg-white hover:bg-indigo-50/40 text-left transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-4">
                      <Scissors className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-700 tracking-tight">
                      CORTE E SOLDA
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Conversão de bobinas em sacos e sacolas. Base para o cálculo de premiação individual por operador.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-700">
                    <span>Milheiros/Sacos • Sucatas • Ranking</span>
                    <span>→</span>
                  </div>
                </button>

                {/* OUTROS SETORES CADASTRADOS */}
                {data.setores
                  .filter((s) => s.ativo && !['set-ext', 'set-imp', 'set-cs'].includes(s.id))
                  .map((customSetor) => (
                    <button
                      key={customSetor.id}
                      type="button"
                      onClick={() => handleSelectSetor(customSetor.id)}
                      className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 bg-white hover:bg-indigo-50/40 text-left transition-all hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-4">
                          <Factory className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-700 tracking-tight uppercase">
                          {customSetor.nome}
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          {customSetor.descricao || 'Apontamento de produção e controle de perdas.'}
                        </p>
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-700">
                        <span>{data.maquinas.filter((m) => m.ativo && m.setorId === customSetor.id).length} máquina(s)</span>
                        <span>→</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* 2. FORMULÁRIO ESPECÍFICO DO SETOR (Requisitos 2, 3, 4, 5, 14, 15, 16, 17) */}
          {viewMode === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulário Principal */}
              <div className="lg:col-span-9 bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                {/* Cabeçalho do Formulário */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                      {selectedSetorId === 'set-ext' && <Layers className="w-5 h-5" />}
                      {selectedSetorId === 'set-imp' && <Printer className="w-5 h-5" />}
                      {selectedSetorId === 'set-cs' && <Scissors className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {formMode === 'edit'
                            ? `Editar Lançamento — ${getSetorName(selectedSetorId)}`
                            : formMode === 'duplicate'
                            ? `Duplicar Lançamento — ${getSetorName(selectedSetorId)}`
                            : `Novo Lançamento — ${getSetorName(selectedSetorId)}`}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                          {selectedSetorId === 'set-ext' ? 'Extrusão' : selectedSetorId === 'set-imp' ? 'Impressão' : 'Corte & Solda'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {formMode === 'create' && (
                      <button
                        type="button"
                        onClick={() => setViewMode('select_sector')}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        Trocar Setor
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                {/* Form Elements - Enter avança de campo sem salvar */}
                <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDownAvancarCampo} className="space-y-6">
                  {/* Bloco 1: Identificação da Operação (Data, Máquina, Operador, Produto) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Identificação da Operação & Produto</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                      {/* Data (Retroativa permitida - Requisito 16) */}
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Produção *</label>
                        <input
                          type="date"
                          required
                          value={formData.data}
                          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Máquina (Filtrada pelo Setor - Requisito 1) */}
                      <div className="lg:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Máquina ({maquinasDoSetor.length}) *
                        </label>
                        <select
                          required
                          value={formData.maquinaId}
                          onChange={(e) => setFormData({ ...formData, maquinaId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecione a máquina...</option>
                          {maquinasDoSetor.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operador (Filtrado pelo Setor - Requisito 1 e 5) */}
                      <div className="lg:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Operador Responsável *
                        </label>
                        <select
                          required
                          value={formData.operadorId}
                          onChange={(e) => setFormData({ ...formData, operadorId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecione o operador...</option>
                          {operadoresDisponiveis.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Produto Fabricado */}
                      <div className="lg:col-span-4">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Produto Fabricado *</label>
                        <select
                          required
                          value={formData.produtoId}
                          onChange={(e) => setFormData({ ...formData, produtoId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecione o produto...</option>
                          {produtosDisponiveis.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.descricao}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 3: Balanço de Matéria-Prima e Pesos (RTL 0,00 - Requisito 2, 3, 4, 5) */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <Scale className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Apontamento de Pesos & Balanço de Massa (kg)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 1º card - Perda (padrão Corte e Solda) */}
                      <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                        <label className="block text-xs font-bold text-amber-800 whitespace-nowrap mb-1">Perda (kg)</label>
                        <RtlDecimalInput
                          value={formData.perdaKg}
                          onChange={handlePerdaChange}
                          className="w-full text-lg font-mono font-bold text-amber-700 border-amber-300"
                        />
                      </div>

                      {/* Refugo Independente */}
                      <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
                        <label className="block text-xs font-bold text-rose-700 whitespace-nowrap mb-1">Refugo (kg)</label>
                        <RtlDecimalInput
                          value={formData.refugoKg}
                          onChange={handleRefugoChange}
                          className="w-full text-lg font-mono font-bold text-rose-600 border-rose-300"
                        />
                      </div>

                      {/* Produção Líquida Boa */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-2xs">
                        <label className="block text-xs font-bold text-emerald-800 whitespace-nowrap mb-1">Produção Boa (kg)</label>
                        <RtlDecimalInput
                          value={formData.quantidadeLiquidaKg}
                          onChange={handleLiquidoChange}
                          className="w-full text-lg font-mono font-black text-emerald-700 border-emerald-300"
                        />
                      </div>

                      {/* Quantidade de Caixas (Regra 3.500 un/cx) - todos os setores */}
                      <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-300 shadow-2xs">
                        <label className="block text-xs font-bold text-emerald-800 whitespace-nowrap mb-1">Caixas Fechadas</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.quantidadeCaixas || ''}
                          onChange={(e) => {
                            const caixas = Number(e.target.value) || 0;
                            const padrao = Number(formData.unidadesPorCaixa) || 3500;
                            setFormData({
                              ...formData,
                              quantidadeCaixas: caixas,
                              quantidadeUnidades: Math.round(caixas * padrao),
                            });
                          }}
                          placeholder="Ex: 10"
                          className="w-full px-3 py-2 text-lg border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco 4: Horários de Operação & Tempos (Cálculo Automático) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Horários de Operação & Tempos</span>
                      </span>
                    </div>

                    {/* Bloco do Horário de Trabalho (De determinado horário até determinado horário) */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Tempo Trabalhado (Horário Início até Fim)</span>
                        </label>
                        {isTurnoNoturno && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>🌙</span>
                            <span>Cruzamento de meia-noite (+1 dia)</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                        {/* Horário Início */}
                        <div className="lg:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hora Início *
                          </label>
                          <input
                            type="time"
                            required
                            value={formData.horaInicio}
                            onChange={(e) => handleHoraInicioChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-xs"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 06:00, 14:20, 22:00</span>
                        </div>

                        {/* Horário Fim */}
                        <div className="lg:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hora Fim *
                          </label>
                          <input
                            type="time"
                            required
                            value={formData.horaFim}
                            onChange={(e) => handleHoraFimChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-xs"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 14:20, 22:40, 06:00</span>
                        </div>

                        {/* Display do Cálculo Automático */}
                        <div className="lg:col-span-4 bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                            Tempo Trabalhado Calculado
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-base font-black text-indigo-950 font-mono">
                              {formatarTempoMinutos(formData.tempoTrabalhadoMinutos)}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 font-mono">
                              ({formData.tempoTrabalhadoMinutos} min)
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-600/90 mt-0.5 block">
                            = {(formData.tempoTrabalhadoMinutos / 60).toFixed(2)} horas de máquina operando
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Apontamento de Paradas de Máquina no Turno */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tempo Parado na Ordem (minutos)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.tempoParadoMinutos}
                          onChange={(e) => setFormData({ ...formData, tempoParadoMinutos: Number(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex items-center justify-between text-[10px] mt-1">
                          <span className="text-slate-400">
                            {formData.tempoParadoMinutos > 0
                              ? `${formData.tempoParadoMinutos} min (${formatarTempoMinutos(formData.tempoParadoMinutos)}) parados`
                              : 'Sem paradas registradas'}
                          </span>
                          {formData.tempoTrabalhadoMinutos > 0 && formData.tempoParadoMinutos > 0 && (
                            <span className="font-semibold text-emerald-700">
                              Líquido rodando: {formatarTempoMinutos(Math.max(0, formData.tempoTrabalhadoMinutos - formData.tempoParadoMinutos))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Motivo da Parada (se tempoParado > 0) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Motivo da Parada {Number(formData.tempoParadoMinutos) > 0 && '*'}
                        </label>
                        <select
                          disabled={Number(formData.tempoParadoMinutos) <= 0}
                          value={formData.motivoParadaId}
                          onChange={(e) => setFormData({ ...formData, motivoParadaId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="">{Number(formData.tempoParadoMinutos) > 0 ? 'Selecione o motivo...' : 'Sem paradas'}</option>
                          {data.motivosParada.filter((m) => m.ativo).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.descricao}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Lançamento</label>
                    <textarea
                      rows={2}
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Troca de lote de resina, oscilação de temperatura na zona 3, troca de rolo puxador."
                    />
                  </div>

                  {/* Botões de Ação do Formulário */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitProducao()}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{formMode === 'edit' ? 'Atualizar Lançamento' : 'Salvar Lançamento'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Painel Lateral: Resumo em Tempo Real (Requisito 17) */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 sticky top-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>Resumo Calculado</span>
                    </h3>
                  </div>

                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-sans">Matéria-Prima Alimentada (calc):</span>
                      <strong className="text-slate-900 text-sm">{calcBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-sans">Produção Boa:</span>
                      <strong className="text-emerald-700 text-sm">{calcLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-sans">Refugo + Perda:</span>
                      <strong className="text-rose-600 text-sm">{calcTotalDescarte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-sans">Taxa de Descarte:</span>
                      <div className="text-right">
                        <strong className="text-slate-900 text-sm">{calcTotalDescartePercent}%</strong>
                        <span className="text-[10px] text-slate-400 block font-sans">Meta: ≤ {metaPerdaSetor}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-sans">Produtividade:</span>
                      <strong className="text-indigo-600 text-sm">{calcProdutividadeKgH} kg/h</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <span className="text-indigo-900 font-sans">Jornada Calculada:</span>
                      <div className="text-right">
                        <strong className="text-indigo-900 text-sm">{formatarTempoMinutos(formData.tempoTrabalhadoMinutos)}</strong>
                        <span className="text-[10px] text-indigo-500 block font-sans">
                          {formData.horaInicio} às {formData.horaFim}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-emerald-900 font-sans">Caixas & Unidades:</span>
                      <div className="text-right">
                        <strong className="text-emerald-800 text-sm">{(formData.quantidadeUnidades || 0).toLocaleString('pt-BR')} un</strong>
                        <span className="text-[10px] text-emerald-700 block font-sans font-semibold">
                          {calcCaixasCorteSolda > 0 ? `${calcCaixasCorteSolda} cx × ` : ''}{formData.unidadesPorCaixa || 3500} un/cx
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status contra a meta do setor */}
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    Number(calcTotalDescartePercent) <= metaPerdaSetor
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {Number(calcTotalDescartePercent) <= metaPerdaSetor ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Dentro da meta de qualidade do setor ({metaPerdaSetor}%).</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Atenção: Taxa de descarte superior à meta ({metaPerdaSetor}%).</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. HISTÓRICO DE LANÇAMENTOS COM FILTROS E TABELA COMPLETA (Requisito 10) */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Barra de Filtros */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Filtros do Histórico</span>
                  </span>
                  {(filters.setorId || filters.maquinaId || filters.operadorId || filters.produtoId || filters.turnoId || filters.dataInicio || filters.dataFim || filters.buscaTexto) && (
                    <button
                      type="button"
                      onClick={() => setFilters({
                        dataInicio: '',
                        dataFim: '',
                        setorId: '',
                        maquinaId: '',
                        operadorId: '',
                        produtoId: '',
                        turnoId: '',
                        buscaTexto: '',
                      })}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Filtros</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Busca livre */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Buscar (OP, Obs, Cliente)</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                      <input
                        type="text"
                        value={filters.buscaTexto}
                        onChange={(e) => setFilters({ ...filters, buscaTexto: e.target.value })}
                        placeholder="Ex: OP-2026, Hortifruti..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Setor */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Setor</label>
                    <select
                      value={filters.setorId}
                      onChange={(e) => setFilters({ ...filters, setorId: e.target.value, maquinaId: '' })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Todos os setores</option>
                      {data.setores.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Máquina */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Máquina</label>
                    <select
                      value={filters.maquinaId}
                      onChange={(e) => setFilters({ ...filters, maquinaId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Todas as máquinas</option>
                      {data.maquinas
                        .filter((m) => !filters.setorId || m.setorId === filters.setorId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                    </select>
                  </div>

                  {/* Operador */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Operador</label>
                    <select
                      value={filters.operadorId}
                      onChange={(e) => setFilters({ ...filters, operadorId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Todos os operadores</option>
                      {data.operadores
                        .filter((op) => !filters.setorId || op.setorId === filters.setorId)
                        .map((op) => (
                          <option key={op.id} value={op.id}>{op.nome}</option>
                        ))}
                    </select>
                  </div>

                  {/* Produto */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Produto</label>
                    <select
                      value={filters.produtoId}
                      onChange={(e) => setFilters({ ...filters, produtoId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Todos os produtos</option>
                      {data.produtos.map((p) => (
                        <option key={p.id} value={p.id}>{p.descricao}</option>
                      ))}
                    </select>
                  </div>

                  {/* Período De */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data De</label>
                    <input
                      type="date"
                      value={filters.dataInicio}
                      onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  {/* Período Até */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Até</label>
                    <input
                      type="date"
                      value={filters.dataFim}
                      onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cartão de Resumo Consolidado no Topo da Tabela (Requisito 7) */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Bruto</span>
                  <strong className="text-sm font-mono font-bold text-white">
                    {consolidados.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Produção Boa</span>
                  <strong className="text-sm font-mono font-bold text-emerald-400">
                    {consolidados.totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Refugo Total</span>
                  <strong className="text-sm font-mono font-bold text-rose-400">
                    {consolidados.totalRefugo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Perda Total</span>
                  <strong className="text-sm font-mono font-bold text-amber-400">
                    {consolidados.totalPerda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">% Descarte Consolidado</span>
                  <strong className="text-sm font-mono font-black text-rose-300">
                    {consolidados.taxaDescarteConsolidada}%
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Apontamentos</span>
                  <strong className="text-sm font-mono font-bold text-slate-200">
                    {consolidados.count} registros
                  </strong>
                </div>
              </div>

              {/* Barra de Ações em Lote */}
              {selectedIdsArray.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-900 text-white p-3 rounded-2xl border border-emerald-700">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{selectedIdsArray.length} lançamento{selectedIdsArray.length > 1 ? 's' : ''} selecionado{selectedIdsArray.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors"
                    >
                      Limpar seleção
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir selecionados
                    </button>
                  </div>
                </div>
              )}

              {/* Tabela de Lançamentos */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {lancamentosFiltrados.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ClipboardPenLine className="w-6 h-6" />
                    </div>
                    <div className="text-slate-800 font-bold text-sm">
                      Nenhum lançamento registrado
                    </div>
                    <p className="text-slate-500 text-xs max-w-sm">
                      Comece a registrar a produção do turno. Clique no botão abaixo para escolher o setor e preencher as informações.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartNovoLancamento}
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>NOVO LANÇAMENTO</span>
                    </button>
                  </div>
                ) : (
                  <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={allVisibleSelected}
                              onChange={toggleSelectAllVisible}
                              title={allVisibleSelected ? 'Desmarcar todos' : 'Selecionar todos os visíveis'}
                              className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3">Data / OP</th>
                          <th className="py-3 px-3">Setor & Máquina</th>
                          <th className="py-3 px-3">Operador / Horário</th>
                          <th className="py-3 px-3">Produto</th>
                          <th className="py-3 px-3 text-right">Peso Bruto</th>
                          <th className="py-3 px-3 text-right text-emerald-800">Prod. Boa</th>
                          <th className="py-3 px-3 text-right text-rose-700">Refugo</th>
                          <th className="py-3 px-3 text-right text-amber-800">Perda</th>
                          <th className="py-3 px-3 text-center">% Descarte</th>
                          <th className="py-3 px-3 text-center">Produtiv.</th>
                          <th className="py-3 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itensPagina.map((l) => {
                          const descarteKg = (l.refugoKg || 0) + (l.perdaKg || 0);
                          const taxaDescarte = l.quantidadeBrutaKg > 0
                            ? ((descarteKg / l.quantidadeBrutaKg) * 100).toFixed(2)
                            : '0.00';

                          return (
                            <tr key={l.id} className={`transition-colors ${selectedIds.has(l.id) ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/80'}`}>
                              {/* Seleção */}
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(l.id)}
                                  onChange={() => toggleSelectItem(l.id)}
                                  className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                                />
                              </td>

                              {/* Data e OP */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-bold text-slate-900">{formatYMDToBR(l.data)}</div>
                                <div className="text-[11px] font-mono text-indigo-600">{l.ordemProducao || 'S/ OP'}</div>
                              </td>

                              {/* Setor e Máquina */}
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800">{getMaquinaName(l.maquinaId)}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">{getSetorName(l.setorId)}</div>
                              </td>

                              {/* Operador e Horário */}
                              <td className="py-3 px-3">
                                <div className="font-medium text-slate-800">{getOperadorName(l.operadorId)}</div>
                                {l.horaInicio && l.horaFim ? (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {l.horaInicio} às {l.horaFim}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400">Jornada integral</div>
                                )}
                              </td>

                              {/* Produto */}
                              <td className="py-3 px-3 max-w-[160px] truncate" title={getProdutoName(l.produtoId)}>
                                <div className="truncate font-medium text-slate-700">{getProdutoName(l.produtoId)}</div>
                                {l.cliente && <div className="text-[10px] text-slate-400 truncate">Cli: {l.cliente}</div>}
                                {l.quantidadeUnidades && l.quantidadeUnidades > 0 && (
                                  <div className="text-[10px] text-emerald-600 font-mono font-medium">
                                    {l.quantidadeUnidades.toLocaleString('pt-BR')} un
                                    {l.quantidadeCaixas && l.quantidadeCaixas > 0 && (
                                      <span className="text-emerald-800 font-bold ml-1">({l.quantidadeCaixas} cx)</span>
                                    )}
                                  </div>
                                )}
                                {l.metragemLinearMetros && l.metragemLinearMetros > 0 && (
                                  <div className="text-[10px] text-violet-600 font-mono font-medium">
                                    {l.metragemLinearMetros.toLocaleString('pt-BR')} m
                                  </div>
                                )}
                              </td>

                              {/* Peso Bruto */}
                              <td className="py-3 px-3 text-right font-mono font-medium text-slate-600">
                                {l.quantidadeBrutaKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                              </td>

                              {/* Produção Boa */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                                {l.quantidadeLiquidaKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                              </td>

                              {/* Refugo */}
                              <td className="py-3 px-3 text-right font-mono font-medium text-rose-600">
                                {(l.refugoKg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                              </td>

                              {/* Perda */}
                              <td className="py-3 px-3 text-right font-mono font-medium text-amber-700">
                                {(l.perdaKg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                              </td>

                              {/* % Descarte */}
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                  Number(taxaDescarte) <= metaPerdaSetor
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {taxaDescarte}%
                                </span>
                              </td>

                              {/* Produtividade */}
                              <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                                {l.produtividadeKgHora || 0} kg/h
                              </td>

                              {/* Ações (VISUALIZAR, EDITAR, DUPLICAR, EXCLUIR - Requisito 10) */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  {/* VISUALIZAR */}
                                  <button
                                    type="button"
                                    onClick={() => setViewingItem(l)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Visualizar Detalhes"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* EDITAR */}
                                  <button
                                    type="button"
                                    onClick={() => handleEditarLancamento(l)}
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Editar Lançamento"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  {/* DUPLICAR */}
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicarLancamento(l)}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Duplicar Lançamento"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>

                                  {/* EXCLUIR */}
                                  <button
                                    type="button"
                                    onClick={() => setDeletingItem(l)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Excluir Lançamento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3">
                    <div className="text-xs text-slate-500">
                      Exibindo <strong className="text-slate-700">{itensPagina.length}</strong> de{' '}
                      <strong className="text-slate-700">{lancamentosFiltrados.length}</strong> lançamentos
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                        disabled={paginaSegura <= 1}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-slate-200 shadow-xs transition-colors"
                      >
                        Anterior
                      </button>
                      <span className="px-2 text-xs font-bold text-indigo-600">
                        {paginaSegura} / {totalPaginas}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                        disabled={paginaSegura >= totalPaginas}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-slate-200 shadow-xs transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      {/* ======================================================== */}
      {/* MODAL: VISUALIZAR LANÇAMENTO (Requisito 10) */}
      {/* ======================================================== */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Ficha do Lançamento de Produção</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Ordem de Produção</span>
                  <strong className="font-mono text-sm font-bold text-indigo-700">{viewingItem.ordemProducao || 'Sem OP'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Data / Horário</span>
                  <strong className="text-slate-800">
                    {formatYMDToBR(viewingItem.data)}
                    {viewingItem.horaInicio && viewingItem.horaFim ? ` • ${viewingItem.horaInicio} às ${viewingItem.horaFim}` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Setor / Máquina</span>
                  <strong className="text-slate-800">{getSetorName(viewingItem.setorId)} • {getMaquinaName(viewingItem.maquinaId)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Operador Responsável</span>
                  <strong className="text-slate-800">{getOperadorName(viewingItem.operadorId)}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Produto Fabricado</span>
                <strong className="text-slate-800 text-sm">{getProdutoName(viewingItem.produtoId)}</strong>
                {viewingItem.cliente && <div className="text-slate-600 mt-0.5">Cliente: {viewingItem.cliente}</div>}
              </div>

              {/* Balanço de Pesos */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2 font-mono">
                <span className="text-slate-500 font-sans font-bold text-[11px] block uppercase">Balanço de Massa</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-sans block">Alimentado</span>
                    <strong className="text-slate-900">{viewingItem.quantidadeBrutaKg.toFixed(2)} kg</strong>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <span className="text-[10px] text-emerald-800 font-sans block">Prod. Boa</span>
                    <strong className="text-emerald-700">{viewingItem.quantidadeLiquidaKg.toFixed(2)} kg</strong>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-lg">
                    <span className="text-[10px] text-rose-800 font-sans block">Refugo</span>
                    <strong className="text-rose-600">{(viewingItem.refugoKg || 0).toFixed(2)} kg</strong>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <span className="text-[10px] text-amber-800 font-sans block">Perda</span>
                    <strong className="text-amber-700">{(viewingItem.perdaKg || 0).toFixed(2)} kg</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-100">
                  <span className="font-sans text-slate-600">Taxa de Descarte:</span>
                  <strong className="text-rose-700">{viewingItem.percentualPerda}%</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-sans text-slate-600">Produtividade Apurada:</span>
                  <strong className="text-indigo-700">{viewingItem.produtividadeKgHora} kg/h</strong>
                </div>
                {viewingItem.quantidadeUnidades && viewingItem.quantidadeUnidades > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-slate-600">Produção em Unidades:</span>
                    <strong className="text-emerald-700">{viewingItem.quantidadeUnidades.toLocaleString('pt-BR')} unidades</strong>
                  </div>
                )}
                {viewingItem.quantidadeCaixas && viewingItem.quantidadeCaixas > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-slate-600">Quantidade de Caixas:</span>
                    <strong className="text-indigo-700 font-bold">
                      {viewingItem.quantidadeCaixas} caixas ({viewingItem.unidadesPorCaixa || 3500} un/cx)
                    </strong>
                  </div>
                )}
                {viewingItem.metragemLinearMetros && viewingItem.metragemLinearMetros > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-slate-600">Metragem Linear:</span>
                    <strong className="text-violet-700">{viewingItem.metragemLinearMetros.toLocaleString('pt-BR')} metros</strong>
                  </div>
                )}
              </div>

              {/* Tempos e Paradas */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Horário Trabalhado:</span>
                  <strong className="font-mono text-slate-800">
                    {viewingItem.horaInicio && viewingItem.horaFim ? `${viewingItem.horaInicio} às ${viewingItem.horaFim}` : 'Não especificado'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duração Calculada:</span>
                  <strong className="font-mono text-slate-800">
                    {formatarTempoMinutos(viewingItem.tempoTrabalhadoMinutos || 0)} ({viewingItem.tempoTrabalhadoMinutos} min / {(((viewingItem.tempoTrabalhadoMinutos || 0) / 60)).toFixed(2)} h)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tempo Parado:</span>
                  <strong className="font-mono text-rose-600">{viewingItem.tempoParadoMinutos || 0} min</strong>
                </div>
                {viewingItem.motivoParadaId && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Motivo Parada:</span>
                    <strong className="text-slate-800">{getMotivoName(viewingItem.motivoParadaId)}</strong>
                  </div>
                )}
              </div>

              {viewingItem.observacoes && (
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-slate-700 italic">
                  &ldquo;{viewingItem.observacoes}&rdquo;
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleEditarLancamento(item);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleDuplicarLancamento(item);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (Requisito 13) */}
      {/* ======================================================== */}
      {deletingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Excluir Lançamento de Produção</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja excluir este lançamento?
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
              <div>OP: <strong>{deletingItem.ordemProducao || 'Sem OP'}</strong></div>
              <div>Data: <strong>{deletingItem.data}</strong></div>
              <div>Máquina: <strong>{getMaquinaName(deletingItem.maquinaId)}</strong></div>
              <div>Operador: <strong>{getOperadorName(deletingItem.operadorId)}</strong></div>
              <div>Peso Bruto: <strong>{deletingItem.quantidadeBrutaKg.toFixed(2)} kg</strong></div>
            </div>

            <p className="text-[11px] text-slate-400">
              O registro será desativado com preservação do histórico lógico da fábrica.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Sim, Excluir Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO EM LOTE */}
      {/* ======================================================== */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Excluir Lançamentos em Lote</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja excluir <strong>{selectedIdsArray.length}</strong> lançamento{selectedIdsArray.length > 1 ? 's' : ''} de produção?
            </p>

            <div className="p-3 max-h-40 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
              {selectedBulkItems.length === 0 && (
                <div className="text-slate-500">Nenhum lançamento (já foram removidos da listagem).</div>
              )}
              {selectedBulkItems.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2">
                  <span>
                    {formatYMDToBR(l.data)} · {getMaquinaName(l.maquinaId)}
                  </span>
                  <span className="text-slate-400">{getOperadorName(l.operadorId)} · {l.quantidadeBrutaKg.toFixed(2)} kg</span>
                </div>
              ))}
              {selectedIdsArray.length > selectedBulkItems.length && (
                <div className="text-slate-500">
                  {selectedIdsArray.length - selectedBulkItems.length} selecionado(s) oculto(s) pelos filtros.
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Os registros serão desativados com preservação do histórico lógico da fábrica.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir {selectedIdsArray.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AVISO DE VALORES ATÍPICOS (Requisito 8) */}
      {/* ======================================================== */}
      {showAtypicalWarning && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-amber-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Atenção: Valor Atípico Detectado</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {showAtypicalWarning}
            </p>
            <p className="text-xs font-medium text-slate-700">
              Este valor parece muito acima do normal. Deseja confirmar e salvar mesmo assim?
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAtypicalWarning(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors"
              >
                Revisar Dados
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                Sim, Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
