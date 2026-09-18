// Importação em lote de Lançamentos de Produção via planilha Excel (.xlsx) ou CSV.
// Converte o arquivo em linhas normalizadas e prontas para o banco de dados.

export interface LancamentoImportRow {
  // Chaves de vínculo (nome ou código). O sistema cria automaticamente o cadastro se não existir.
  data: string; // YYYY-MM-DD
  setor: string;
  maquina: string;
  operador: string;
  produto: string;
  turno?: string;
  ordemProducao?: string;
  cliente?: string;
  metragemLinearMetros?: number;
  quantidadeCaixas?: number;
  unidadesPorCaixa?: number;
  quantidadeUnidades?: number;
  quantidadeBrutaKg?: number;
  quantidadeLiquidaKg?: number;
  refugoKg?: number;
  perdaKg?: number;
  horaInicio?: string;
  horaFim?: string;
  tempoTrabalhadoMinutos?: number;
  tempoParadoMinutos?: number;
  motivoParada?: string;
  observacoes?: string;
}

export interface ParseImportResult {
  rows: LancamentoImportRow[];
  errors: string[];
}

export interface ImportLancamentosResult {
  total: number;
  imported: number;
  skipped: number;
  created: {
    setores: number;
    maquinas: number;
    operadores: number;
    produtos: number;
    turnos: number;
    motivos: number;
  };
  errors: string[];
}

type RawRecord = Record<string, unknown>;

function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Aliases aceitos para cada campo (já normalizados)
const FIELD_ALIASES: Record<keyof Omit<LancamentoImportRow, never>, string[]> = {
  data: ['data', 'datadaproducao', 'dataproducao', 'dia', 'datadelancamento'],
  setor: ['setor', 'setordeproducao', 'area', 'setorarea', 'departamento'],
  maquina: ['maquina', 'maquinadeproducao', 'equipamento', 'maquinaequipamento'],
  operador: ['operador', 'operadoresponsavel', 'nomeoperador', 'funcionario', 'colaborador'],
  produto: ['produto', 'produtofabricado', 'descricaoproduto', 'item', 'material'],
  turno: ['turno', 'turnodetrabalho', 'codigoturno', 'turma'],
  ordemProducao: ['ordemdeproducao', 'ordemproducao', 'op', 'ordem', 'lote', 'ordemdelote'],
  cliente: ['cliente', 'clientetrabalhoespecial', 'trabalho', 'trabalhoespecial'],
  metragemLinearMetros: ['metragemlinear', 'metragemlinear metros', 'metros', 'metragem', 'metrosrodados'],
  quantidadeCaixas: ['quantidadedecaixas', 'quantidadecaixas', 'caixas', 'caixasfechadas', 'qtdcaixas', 'caixasapontadas'],
  unidadesPorCaixa: ['unidadesporcaixa', 'unidporcaixa', 'uncx', 'unidadescaixa', 'unsporcaixa'],
  quantidadeUnidades: ['quantidadedeunidades', 'quantidadeunidades', 'unidades', 'milheiros', 'sacos', 'qtdunidades', 'milheiro'],
  quantidadeBrutaKg: ['pesobruto', 'pesobrutokg', 'quantidadebrutakg', 'bruto', 'brutokg', 'materiaprima', 'materiaprimaalimentada', 'quantidadebruta'],
  quantidadeLiquidaKg: ['producaoboa', 'producaoboakg', 'quantidadeliquidakg', 'liquido', 'liquidokg', 'pesoliquido', 'quantidadeliquida', 'boa'],
  refugoKg: ['refugo', 'refugokg', 'aparas', 'borras', 'sucata', 'refugoeperda'],
  perdaKg: ['perda', 'perdakg', 'perdas'],
  horaInicio: ['horainicio', 'horadeinicio', 'inicio', 'horainicial', 'hinicio', 'hinicial'],
  horaFim: ['horafim', 'horadefim', 'fim', 'horafinal', 'hfim', 'hfinal'],
  tempoTrabalhadoMinutos: ['tempotrabalhadomin', 'tempotrabalhado', 'tempotrabalhadominutos', 'minutostrabalhados', 'horastrabalhadas'],
  tempoParadoMinutos: ['tempoparadomin', 'tempoparado', 'tempoparadominutos', 'minutosparados', 'paradamin'],
  motivoParada: ['motivodaparada', 'motivoparada', 'motivo', 'causaparada', 'causa'],
  observacoes: ['observacoes', 'observacao', 'obs', 'detalhes', 'comentarios'],
};

// Fallback por palavra-chave contida no nome da coluna (ex.: "Operador responsável" → operador)
const FIELD_CONTAINS: Record<keyof Omit<LancamentoImportRow, never>, string[]> = {
  data: ['data', 'dia'],
  setor: ['setor', 'area'],
  maquina: ['maquina', 'equipament'],
  operador: ['operador', 'funcionario', 'colaborador'],
  produto: ['produto', 'material'],
  turno: ['turno', 'turma'],
  ordemProducao: ['ordem', 'lote'],
  cliente: ['cliente', 'trabalho'],
  metragemLinearMetros: ['metragem', 'metrosrodados'],
  quantidadeCaixas: ['caixa'],
  unidadesPorCaixa: ['unidporcaixa', 'porcaixa'],
  quantidadeUnidades: ['milheiro', 'milheiros', 'unidades', 'sacos'],
  quantidadeBrutaKg: ['bruto', 'materiaprima', 'alimentada', 'alimentado'],
  quantidadeLiquidaKg: ['liquida', 'liquidokg', 'producaoboa', 'pesoliquido', 'boakg'],
  refugoKg: ['refugo', 'apara', 'borra', 'sucata'],
  perdaKg: ['perda'],
  horaInicio: ['horainicio', 'horainicial', 'hinicio'],
  horaFim: ['horafim', 'horafinal', 'hfim'],
  tempoTrabalhadoMinutos: ['trabalhado', 'minutostrabal', 'horastrabal'],
  tempoParadoMinutos: ['parado'],
  motivoParada: ['motivo', 'causa'],
  observacoes: ['observac', 'comentario', 'obs'],
};

function findValue(record: RawRecord, field: keyof Omit<LancamentoImportRow, never>, claimed?: Set<string>): unknown {
  const wantedExact = new Set(FIELD_ALIASES[field].map((a) => normalizeKey(a)));

  // 1. Correspondência exata (nome da coluna igual a um alias)
  for (const [key, value] of Object.entries(record)) {
    if (claimed?.has(key)) continue;
    if (wantedExact.has(normalizeKey(key))) {
      claimed?.add(key);
      return value;
    }
  }

  // 2. Correspondência por palavra-chave contida
  for (const [key, value] of Object.entries(record)) {
    if (claimed?.has(key)) continue;
    const k = normalizeKey(key);
    if (k && FIELD_CONTAINS[field].some((word) => k.includes(word))) {
      claimed?.add(key);
      return value;
    }
  }

  return undefined;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

function toNumber(value: unknown): number | undefined {
  if (isEmpty(value)) return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;

  let str = String(value).trim().replace(/[R$\s%kKmMgG]/g, '');
  if (str === '') return undefined;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    // Formato pt-BR: 1.234,56 -> ponto é milhar
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    str = str.replace(',', '.');
  }

  const num = Number(str);
  return isNaN(num) ? undefined : num;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function dateToISO(date: Date): string {
  // Usa componentes UTC: datas do Excel/SheetJS são armazenadas em UTC sem timezone
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function excelSerialToISO(serial: number): string {
  // Datas do Excel são "calendário puro" (sem timezone): serial 0 = 1899-12-30
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  return dateToISO(date);
}

function toDateISO(value: unknown): string | undefined {
  if (isEmpty(value)) return undefined;

  if (value instanceof Date) return dateToISO(value);

  if (typeof value === 'number') {
    // Número serial de data do Excel (aproximadamente entre 1900 e 2100)
    if (value > 20000 && value < 60000) return excelSerialToISO(value);
    return undefined;
  }

  const str = String(value).trim();
  if (str === '') return undefined;

  // YYYY-MM-DD
  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`;
  }

  // DD/MM/YYYY (ou DD-MM-YYYY)
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${pad2(Number(match[2]))}-${pad2(Number(match[1]))}`;
  }

  // DD/MM (assume ano atual)
  match = str.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = new Date().getFullYear();
    return `${year}-${pad2(Number(match[2]))}-${pad2(Number(match[1]))}`;
  }

  return undefined;
}

function toHHmm(value: unknown): string | undefined {
  if (isEmpty(value)) return undefined;

  if (value instanceof Date) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }

  if (typeof value === 'number') {
    // Fração do dia (0 a 1)
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      return `${pad2(Math.floor(totalMinutes / 60) % 24)}:${pad2(totalMinutes % 60)}`;
    }
    return undefined;
  }

  const str = String(value).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${pad2(Number(match[1]))}:${pad2(Number(match[2]))}`;

  return undefined;
}

function toText(value: unknown): string | undefined {
  if (isEmpty(value)) return undefined;
  return String(value).trim();
}

const requiredFields: Array<{ key: keyof LancamentoImportRow; label: string }> = [
  { key: 'maquina', label: 'Máquina' },
  { key: 'operador', label: 'Operador' },
  { key: 'produto', label: 'Produto' },
];

// Palavras-chave para reconhecer automaticamente o Setor e a Máquina quando a coluna
// contém apenas o tipo de equipamento (ex.: "Impressora", "Extrusora", "Corte 2").
export const SETOR_KEYWORDS: Array<{ keywords: string[]; nome: string; id: string }> = [
  { keywords: ['impress', 'flexo'], nome: 'Impressão', id: 'set-imp' },
  { keywords: ['extrud', 'extrus'], nome: 'Extrusora', id: 'set-ext' },
  { keywords: ['corte', 'solda', 'sacola', 'saco', 'sacaria'], nome: 'Corte e Solda', id: 'set-cs' },
];

export function matchSetorByKeyword(text: string | undefined): { nome: string; id: string } | null {
  if (!text) return null;
  const normalized = normalizeKey(text);
  if (!normalized) return null;
  for (const config of SETOR_KEYWORDS) {
    if (config.keywords.some((kw) => normalized.includes(normalizeKey(kw)))) {
      return { nome: config.nome, id: config.id };
    }
  }
  return null;
}

// Parser CSV próprio: preserva o texto original das células (datas "2026-01-15",
// números "1250,50") sem a coerção/remodelagem do SheetJS, que poderia deslocar datas.
function makeCsvSplitter(delimiter: string): (line: string) => string[] {
  return (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };
}

function detectCsvDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCsvToRecords(text: string): RawRecord[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const splitLine = makeCsvSplitter(delimiter);

  const headers = splitLine(lines[0]).map((h) => h.trim());
  const records: RawRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const record: RawRecord = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? '';
    });
    records.push(record);
  }

  return records;
}

// Lê o arquivo (xlsx/xls/csv) e transforma em linhas normalizadas
export async function parseLancamentosFile(file: File): Promise<ParseImportResult> {
  const isCsv = /\.(csv|txt)$/i.test(file.name);

  let records: RawRecord[];

  if (isCsv) {
    const text = await file.text();
    records = parseCsvToRecords(text);
  } else {
    // XLSX/XLS: células numéricas já vêm como número e datas como Date (sem ambiguidade de separador)
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    // Sem cellDates: datas/tempos vêm como serial numérico puro (calendário do Excel, sem timezone)
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return { rows: [], errors: ['A planilha não possui nenhuma aba com dados.'] };
    records = XLSX.utils.sheet_to_json<RawRecord>(workbook.Sheets[firstSheetName], {
      defval: '',
      raw: true,
      blankrows: false,
    });
  }

  return mapRecordsToRows(records);
}

export function mapRecordsToRows(records: RawRecord[]): ParseImportResult {
  const rows: LancamentoImportRow[] = [];
  const errors: string[] = [];
  const hoje = new Date().toISOString().split('T')[0];

  records.forEach((record, index) => {
    // Ignora linhas totalmente vazias
    const hasAnyValue = Object.values(record).some((v) => !isEmpty(v));
    if (!hasAnyValue) return;

    const rowNumber = index + 2; // +2 = cabeçalho + base 1

    // Cada coluna do arquivo só pode alimentar UM campo do sistema (evita conflitos
    // entre "Unidades por Caixa", "Quantidade de Caixas" e "Quantidade de Unidades")
    const claimed = new Set<string>();

    const row: LancamentoImportRow = {
      data: toDateISO(findValue(record, 'data', claimed)) || hoje,
      setor: toText(findValue(record, 'setor', claimed)) || '',
      maquina: toText(findValue(record, 'maquina', claimed)) || '',
      operador: toText(findValue(record, 'operador', claimed)) || '',
      produto: toText(findValue(record, 'produto', claimed)) || '',
      turno: toText(findValue(record, 'turno', claimed)),
      ordemProducao: toText(findValue(record, 'ordemProducao', claimed)),
      cliente: toText(findValue(record, 'cliente', claimed)),
      metragemLinearMetros: toNumber(findValue(record, 'metragemLinearMetros', claimed)),
      unidadesPorCaixa: toNumber(findValue(record, 'unidadesPorCaixa', claimed)),
      quantidadeCaixas: toNumber(findValue(record, 'quantidadeCaixas', claimed)),
      quantidadeUnidades: toNumber(findValue(record, 'quantidadeUnidades', claimed)),
      quantidadeBrutaKg: toNumber(findValue(record, 'quantidadeBrutaKg', claimed)),
      quantidadeLiquidaKg: toNumber(findValue(record, 'quantidadeLiquidaKg', claimed)),
      refugoKg: toNumber(findValue(record, 'refugoKg', claimed)),
      perdaKg: toNumber(findValue(record, 'perdaKg', claimed)),
      horaInicio: toHHmm(findValue(record, 'horaInicio', claimed)),
      horaFim: toHHmm(findValue(record, 'horaFim', claimed)),
      tempoTrabalhadoMinutos: toNumber(findValue(record, 'tempoTrabalhadoMinutos', claimed)),
      tempoParadoMinutos: toNumber(findValue(record, 'tempoParadoMinutos', claimed)),
      motivoParada: toText(findValue(record, 'motivoParada', claimed)),
      observacoes: toText(findValue(record, 'observacoes', claimed)),
    };

    const missing = requiredFields.filter((f) => !String(row[f.key] ?? '').trim());
    if (missing.length > 0) {
      errors.push(`Linha ${rowNumber}: campos obrigatórios ausentes (${missing.map((m) => m.label).join(', ')}).`);
      return;
    }

    rows.push(row);
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('Nenhuma linha válida foi encontrada na planilha.');
  }

  return { rows, errors };
}

export const IMPORT_TEMPLATE_HEADERS = [
  'Data',
  'Maquina',
  'Operador',
  'Produto',
  'Perda (kg)',
  'Refugo (kg)',
  'Producao Boa (kg)',
  'Caixas Fechadas',
  'Hora Inicio',
  'Hora Fim',
  'Tempo Parado (min)',
  'Motivo da Parada',
];

export const IMPORT_TEMPLATE_EXAMPLE = [
  '2026-01-15',
  'Impressora',
  'Joao Silva',
  'Saco Plastico',
  '20,00',
  '30,50',
  '1200,00',
  '342',
  '06:00',
  '14:20',
  '45',
  'Troca de cliche',
];

export function downloadImportTemplate(): void {
  const csvContent =
    '\uFEFF' +
    [IMPORT_TEMPLATE_HEADERS.join(';'), IMPORT_TEMPLATE_EXAMPLE.join(';')].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_importacao_lancamentos.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
