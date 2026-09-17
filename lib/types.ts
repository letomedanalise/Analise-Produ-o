// Definições de Tipos para o Sistema de Gestão Industrial (PCP & Chão de Fábrica)

export type UnidadeMedida = 'kg' | 'milheiro' | 'metros' | 'unidade';

export type StatusMaquina = 'operando' | 'parada' | 'manutencao';

export type TipoParada = 'programada' | 'nao_programada' | 'operacional';

export type TipoMaterial = 'PEBD' | 'PEAD' | 'PP' | 'BOPP' | 'Reciclado' | 'Outro';

export interface Setor {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  unidadePadrao: UnidadeMedida;
  ativo: boolean;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface Maquina {
  id: string;
  codigo: string;
  nome: string;
  setorId: string;
  capacidadeNominalHora: number; // kg/h ou m/min
  status: StatusMaquina;
  modelo?: string;
  anoFabricacao?: number;
  ativo: boolean;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Operador {
  id: string;
  matricula: string;
  nome: string;
  setorId: string;
  turnoPadraoId?: string;
  metaPerdaMaximaPercent: number; // ex: 2.5 para bonificação
  ativo: boolean;
  dataAdmissao?: string;
  cargo?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  setorOrigemId: string;
  tipoMaterial: TipoMaterial;
  larguraMm?: number;
  espessuraMicras?: number;
  comprimentoMm?: number;
  pesoPadraoMilheiroKg?: number;
  ativo: boolean;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Turno {
  id: string;
  codigo: string;
  nome: string;
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  cargaHorariaMinutos: number; // ex: 480
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MotivoParada {
  id: string;
  codigo: string;
  descricao: string;
  tipo: TipoParada;
  setorId?: string; // Vazio = todos os setores
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegraPremiacao {
  id: string;
  setorId: string;
  metaPerdaPercentual: number; // Ex: 2.0%
  toleranciaMaximaPercentual: number; // Ex: 3.5%
  valorBasePremio: number; // R$
  tipoPremio: 'individual' | 'equipe' | 'turno';
  ativo: boolean;
  updatedAt: string;
}

// Lançamento de Produção (para histórico e cálculos automáticos)
export interface LancamentoProducao {
  id: string;
  data: string; // YYYY-MM-DD
  turnoId: string;
  setorId: string;
  maquinaId: string;
  operadorId: string;
  produtoId: string;
  ordemProducao?: string;
  
  // Pesos e Quantidades
  quantidadeBrutaKg: number; // Total alimentado
  quantidadeLiquidaKg: number; // Produção boa
  refugoKg: number; // Aparas, borras, refugo de processo
  perdaKg?: number; // Perda independente (acerto, setup, descarte térmico, etc.)
  percentualPerda: number; // (((refugoKg + (perdaKg || 0)) / quantidadeBrutaKg) * 100)
  
  // Específico por setor (das planilhas de referência)
  cliente?: string; // Utilizado no setor de Impressão / OP
  metragemLinearMetros?: number; // Utilizado no setor de Impressão (metros rodados)
  quantidadeUnidades?: number; // Utilizado no setor de Corte e Solda (milheiros / sacos produzidos)
  quantidadeCaixas?: number; // Específico Corte e Solda: Quantidade de caixas apontadas
  unidadesPorCaixa?: number; // Padrão 3500 unidades por caixa (Letomed)
  motivoParadaId?: string; // Motivo da parada quando houver tempo parado

  // Apontamento de tempos
  horaInicio?: string; // HH:mm
  horaFim?: string; // HH:mm
  tempoTrabalhadoMinutos: number;
  tempoParadoMinutos: number;
  produtividadeKgHora: number; // (quantidadeLiquidaKg / (tempoTrabalhadoMinutos / 60))
  
  status: 'concluido' | 'em_andamento' | 'cancelado';
  observacoes?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Apontamento de Parada de Máquina
export interface LancamentoParada {
  id: string;
  lancamentoProducaoId?: string;
  data: string;
  turnoId: string;
  maquinaId: string;
  operadorId: string;
  motivoParadaId: string;
  tempoMinutos: number;
  horaInicio?: string;
  horaFim?: string;
  observacoes?: string;
  createdAt: string;
}

// Estrutura Geral do Banco de Dados
export interface DatabaseSchema {
  setores: Setor[];
  maquinas: Maquina[];
  operadores: Operador[];
  produtos: Produto[];
  turnos: Turno[];
  motivosParada: MotivoParada[];
  regrasPremiacao: RegraPremiacao[];
  lancamentosProducao: LancamentoProducao[];
  lancamentosParada: LancamentoParada[];
  configuracoes: {
    nomeEmpresa: string;
    cnpj?: string;
    metaGeralPerda: number;
    diasTrabalhadosMes: number;
    ultimaAtualizacao: string;
  };
}
