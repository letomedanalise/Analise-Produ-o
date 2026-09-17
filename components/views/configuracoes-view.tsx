'use client';

import React, { useState } from 'react';
import { useProductionDB } from '@/lib/db-context';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
  Building2,
  Cloud,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SUPABASE_CONFIG, SUPABASE_SQL_SETUP } from '@/lib/supabase';

export function ConfiguracoesView() {
  const {
    data,
    resetToDefaults,
    clearProductionData,
    clearAllData,
    exportBackupJSON,
    importBackupJSON,
    loadDemoData,
    supabaseInfo,
    checkSupabaseConnection,
    forceSyncToSupabase,
  } = useProductionDB();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState(data.configuracoes.nomeEmpresa);
  const [metaGeral, setMetaGeral] = useState(data.configuracoes.metaGeralPerda);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const handleScanLocalCache = () => {
    if (typeof window === 'undefined') return;
    const keysToCheck = ['gestao_producao_backup_v2', 'gestao_producao_db_v2', 'gestao_producao_db'];
    let bestCandidate: any = null;
    let maxLancamentos = 0;

    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const count = Array.isArray(parsed?.lancamentosProducao) ? parsed.lancamentosProducao.length : 0;
          if (count > maxLancamentos) {
            maxLancamentos = count;
            bestCandidate = parsed;
          }
        }
      } catch {}
    }

    if (maxLancamentos > 0 && bestCandidate) {
      importBackupJSON(JSON.stringify(bestCandidate));
      setFeedback({
        type: 'success',
        message: `Sucesso! Encontrados e restaurados ${maxLancamentos} lançamentos do cache do navegador!`,
      });
      setScanResult(`Restaurados ${maxLancamentos} apontamentos do cache local.`);
    } else {
      setScanResult('Nenhum lançamento encontrado nas chaves locais deste navegador.');
      setFeedback({
        type: 'error',
        message: 'Nenhum lançamento antigo foi encontrado neste navegador. Se você preencheu em outro link (ex: AI Studio), use a opção "Exportar Backup JSON" lá e "Importar" aqui.',
      });
    }
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    await checkSupabaseConnection();
    setIsTesting(false);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    const ok = await forceSyncToSupabase();
    setIsSyncing(false);
    if (ok) {
      setFeedback({ type: 'success', message: 'Todos os cadastros e apontamentos foram sincronizados no Supabase!' });
    } else {
      setFeedback({
        type: 'error',
        message: 'A tabela industrial_data ainda não foi criada no Supabase. Copie o script SQL abaixo e execute no SQL Editor.',
      });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestao_producao_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'Backup JSON baixado com sucesso!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        setFeedback({ type: 'success', message: 'Dados restaurados a partir do backup com sucesso!' });
      } else {
        setFeedback({ type: 'error', message: 'Arquivo de backup inválido ou corrompido.' });
      }
      setTimeout(() => setFeedback(null), 3500);
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (window.confirm('Tem certeza de que deseja restaurar os dados padrão de fábrica? Isso recriará os operadores, máquinas, produtos e lançamentos de exemplo da indústria.')) {
      await resetToDefaults();
      setFeedback({ type: 'success', message: 'Banco de dados restaurado para os dados padrão de fábrica!' });
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleClearProduction = async () => {
    if (window.confirm('Deseja zerar todos os lançamentos e paradas fictícias? Os cadastros de máquinas, operadores e produtos serão mantidos para você começar os apontamentos reais.')) {
      await clearProductionData();
      setFeedback({ type: 'success', message: 'Todos os lançamentos de teste foram removidos! Base pronta para produção real.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('ATENÇÃO: Deseja zerar completamente a base (cadastros e lançamentos) para cadastrar tudo do zero?')) {
      await clearAllData();
      setFeedback({ type: 'success', message: 'Base de dados completamente zerada para cadastro inicial!' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleLoadDemo = async () => {
    if (window.confirm('Deseja carregar lançamentos e paradas demonstrativas para visualizar os relatórios e painéis? Seus cadastros de máquinas e operadores serão preservados.')) {
      await loadDemoData();
      setFeedback({ type: 'success', message: 'Dados demonstrativos carregados com sucesso! Acesse o Painel Geral para visualizar os indicadores.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Configurações & Parâmetros do Sistema</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão dos parâmetros da fábrica, metas corporativas e ferramentas de persistência e backup de dados.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Parâmetros Gerais */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Informações da Fábrica & Metas Globais</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Empresa / Fábrica</label>
            <input
              type="text"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Meta Geral Máxima de Perda (%)</label>
            <input
              type="number"
              step="0.1"
              value={metaGeral}
              onChange={(e) => setMetaGeral(parseFloat(e.target.value) || 2.5)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* Integração com Banco de Dados em Nuvem Supabase */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Banco de Dados em Nuvem: Supabase</h3>
                {supabaseInfo.tableExists ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Conectado & Sincronizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    Pendente Criação de Tabela
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Projeto conectado: <code className="font-mono font-semibold text-slate-700">{SUPABASE_CONFIG.projectId}</code> ({SUPABASE_CONFIG.url})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>

            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Sincronizando...' : 'Enviar Dados ao Supabase'}</span>
            </button>
          </div>
        </div>

        {/* Status e Instrução de Configuração */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 font-medium">
              <strong>Status do Diagnóstico:</strong> {supabaseInfo.message || 'Verificação concluída.'}
            </span>
            {supabaseInfo.lastSyncedAt && (
              <span className="text-slate-500 text-[11px]">
                Última sincronização: <strong>{supabaseInfo.lastSyncedAt}</strong>
              </span>
            )}
          </div>

          {!supabaseInfo.tableExists && (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Passo final: Crie a tabela industrial_data no Supabase</span>
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Suas chaves de API já estão autenticadas. Basta copiar o script abaixo, colar no <strong>SQL Editor</strong> do painel do Supabase e clicar em <strong>Run</strong>:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Script SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto select-all leading-relaxed">
                  {SUPABASE_SQL_SETUP}
                </pre>
              </div>

              <div className="flex items-center justify-between text-[11px] text-amber-800/90 pt-1">
                <span>Após executar no Supabase, clique no botão <strong>&quot;Testar Conexão&quot;</strong> ou <strong>&quot;Enviar Dados ao Supabase&quot;</strong> acima.</span>
                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-900 hover:underline flex items-center gap-1"
                >
                  <span>Abrir SQL Editor no Supabase</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Limpeza e Transição para Dados Reais */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-amber-600" />
          <span>Iniciar Produção Real (Limpeza de Dados Fictícios)</span>
        </h3>
        <p className="text-xs text-slate-500">
          Utilize as opções abaixo para remover os dados de demonstração e deixar o sistema 100% limpo para a rotina da sua fábrica:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Zerar apenas Lançamentos */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-900">Zerar Lançamentos de Demonstração</h4>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-semibold">Recomendado</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Remove todos os apontamentos fictícios de produção e paradas. Mantém os cadastros de máquinas, operadores e produtos para você começar a registrar a produção real agora mesmo.
            </p>
            <button
              type="button"
              onClick={handleClearProduction}
              className="w-full mt-2 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Todos os Lançamentos Fictícios</span>
            </button>
          </div>

          {/* Zerar Base Completa */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Zerar Base Completa (Cadastros + Lançamentos)</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Limpa completamente o banco de dados (inclusive máquinas, operadores, turnos e produtos) para quem deseja cadastrar a fábrica 100% do zero.
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full mt-2 py-2 px-3 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Zerar Cadastros e Dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup e Persistência */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Persistência, Backup e Restauração de Dados</span>
        </h3>
        <p className="text-xs text-slate-500">
          O sistema armazena todos os cadastros e lançamentos em banco de dados persistente no servidor e sincronizado no navegador. Você pode baixar cópias de segurança ou restaurar a qualquer momento.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Dados Demonstrativos */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dados de Demonstração</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Gera apontamentos e paradas realistas para preencher o Painel Geral, gráficos e indicadores imediatamente.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Carregar Demonstração</span>
            </button>
          </div>

          {/* Exportar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Exportar Backup Completo</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Gera um arquivo .json contendo todos os setores, máquinas, operadores, produtos e lançamentos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="w-full mt-2 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Baixar Backup JSON</span>
            </button>
          </div>

          {/* Importar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Importar Backup</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Carregue um arquivo JSON exportado previamente para restaurar o estado do sistema.
              </p>
            </div>
            <label className="w-full mt-2 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Selecionar Arquivo</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          {/* Restaurar Padrões */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Dados Padrão de Fábrica</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Restaura a base de dados para o modelo inicial de plástico (Extrusora, Impressão, Corte e Solda).
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-full mt-2 py-2 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Restaurar Padrões</span>
            </button>
          </div>
        </div>
      </div>

      {/* Diagnóstico de Armazenamento e Recuperação de Cache */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Diagnóstico de Armazenamento & Recuperação de Apontamentos</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status em tempo real da memória deste navegador e ferramentas para resgate de dados preenchidos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleScanLocalCache}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Escanear & Recuperar Cache do Navegador</span>
          </button>
        </div>

        {scanResult && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium">
            {scanResult}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Lançamentos de Produção</span>
            <p className="text-xl font-black text-slate-900 mt-1">{data.lancamentosProducao.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Apontamentos de Paradas</span>
            <p className="text-xl font-black text-slate-900 mt-1">{data.lancamentosParada.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Máquinas Cadastradas</span>
            <p className="text-xl font-black text-slate-900 mt-1">{data.maquinas.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Operadores Ativos</span>
            <p className="text-xl font-black text-slate-900 mt-1">{data.operadores.length}</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Preencheu os dados no Google AI Studio e quer vê-los na Vercel (ou vice-versa)?</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Como cada link possui seu próprio endereço (domínio isolado no navegador):
          </p>
          <ol className="text-[11px] text-amber-800 list-decimal list-inside space-y-1 pl-1">
            <li>No link onde você preencheu seus dados, clique no botão <strong>&quot;Baixar Backup JSON&quot;</strong> acima.</li>
            <li>Abra o seu site na Vercel (<strong>letomed.vercel.app</strong>), vá em <strong>Configurações</strong> e clique em <strong>&quot;Importar Backup&quot;</strong>.</li>
            <li>Pronto! Todos os apontamentos, máquinas e operadores serão transferidos na mesma hora e protegidos contra perda.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
