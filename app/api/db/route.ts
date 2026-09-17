import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { INITIAL_DATABASE_DATA } from '@/lib/default-data';
import { DatabaseSchema } from '@/lib/types';
import { getSupabaseServerClient, SUPABASE_CONFIG, SUPABASE_SQL_SETUP } from '@/lib/supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const TMP_FILE = path.join('/tmp', 'industrial_db.json');

// Cache em memória para instâncias ativas (Vercel Serverless)
let inMemoryCache: DatabaseSchema | null = null;

// Operações locais de fallback / redundância
async function getStoredDataLocal(): Promise<DatabaseSchema> {
  if (inMemoryCache && Array.isArray(inMemoryCache.lancamentosProducao) && inMemoryCache.lancamentosProducao.length > 0) {
    return inMemoryCache;
  }

  // Tenta ler do /tmp (diretório com permissão de gravação na Vercel)
  try {
    const tmpContent = await fs.readFile(TMP_FILE, 'utf-8');
    const parsed = JSON.parse(tmpContent) as DatabaseSchema;
    if (parsed && parsed.setores) {
      inMemoryCache = parsed;
      return parsed;
    }
  } catch {
    // Continua para o arquivo do bundle
  }

  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content) as DatabaseSchema;
    inMemoryCache = parsed;
    return parsed;
  } catch {
    return INITIAL_DATABASE_DATA;
  }
}

async function saveStoredDataLocal(data: DatabaseSchema): Promise<boolean> {
  inMemoryCache = data;
  let savedAtLeastOnce = false;

  // Grava em /tmp (sempre gravável na Vercel)
  try {
    await fs.writeFile(TMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    savedAtLeastOnce = true;
  } catch {
    // continua
  }

  // Tenta gravar em data/db.json (ambiente local/container)
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    savedAtLeastOnce = true;
  } catch {
    // Em ambientes read-only (como Vercel lambda), a escrita em process.cwd pode falhar
  }

  return savedAtLeastOnce;
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  let supabaseActive = false;
  let tableMissing = false;

  if (supabase) {
    try {
      const { data: row, error } = await supabase
        .from(SUPABASE_CONFIG.tableName)
        .select('data, updated_at')
        .eq('id', 'current')
        .maybeSingle();

      if (!error && row && row.data && row.data.setores) {
        // Sucesso ao ler dados do Supabase!
        const supaData = row.data as DatabaseSchema;
        // Salva backup local
        await saveStoredDataLocal(supaData);
        return NextResponse.json({
          success: true,
          data: supaData,
          source: 'supabase',
          supabaseConfigured: true,
          supabaseActive: true,
        });
      }

      if (!error && !row) {
        // Tabela existe mas está vazia - inicializa com dados locais ou padrão
        const localData = await getStoredDataLocal();
        await supabase.from(SUPABASE_CONFIG.tableName).upsert({
          id: 'current',
          data: localData,
          updated_at: new Date().toISOString(),
        });
        return NextResponse.json({
          success: true,
          data: localData,
          source: 'supabase_seeded',
          supabaseConfigured: true,
          supabaseActive: true,
        });
      }

      if (error) {
        // Código PGRST205 indica tabela ainda não criada no Supabase
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          tableMissing = true;
        }
      }
    } catch (err) {
      console.warn('Aviso: Falha temporária ao consultar Supabase, usando cache local:', err);
    }
  }

  // Fallback para armazenamento local
  const localData = await getStoredDataLocal();
  return NextResponse.json({
    success: true,
    data: localData,
    source: 'local',
    supabaseConfigured: !!supabase,
    supabaseActive: supabaseActive,
    tableMissing,
    sqlSetup: tableMissing ? SUPABASE_SQL_SETUP : undefined,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    const supabase = getSupabaseServerClient();

    // Diagnóstico e teste de conexão
    if (action === 'test_connection') {
      if (!supabase) {
        return NextResponse.json({
          success: false,
          connected: false,
          message: 'Supabase URL ou Anon Key não configurados.',
        });
      }

      try {
        const { data, error } = await supabase
          .from(SUPABASE_CONFIG.tableName)
          .select('id, updated_at')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
            return NextResponse.json({
              success: true,
              connected: true,
              tableExists: false,
              message: 'Conectado ao Supabase com sucesso! A tabela "industrial_data" ainda não foi criada.',
              sqlSetup: SUPABASE_SQL_SETUP,
            });
          }
          return NextResponse.json({
            success: false,
            connected: false,
            message: `Erro do Supabase: ${error.message}`,
          });
        }

        // Testa permissão de gravação (verificar se RLS está bloqueando)
        const localData = await getStoredDataLocal();
        const { error: writeError } = await supabase.from(SUPABASE_CONFIG.tableName).upsert({
          id: 'current',
          data: localData,
          updated_at: new Date().toISOString(),
        });

        if (writeError && writeError.message?.includes('row-level security policy')) {
          return NextResponse.json({
            success: true,
            connected: true,
            tableExists: false,
            rlsBlocked: true,
            message: 'Tabela encontrada, porém o Supabase bloqueou gravação por RLS. Execute o comando para liberar:',
            sqlSetup: `ALTER TABLE industrial_data DISABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "Public access" ON industrial_data;\nCREATE POLICY "Public access" ON industrial_data FOR ALL TO anon USING (true) WITH CHECK (true);`,
          });
        }

        return NextResponse.json({
          success: true,
          connected: true,
          tableExists: true,
          message: 'Conexão com Supabase ativa e sincronização em tempo real liberada!',
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          connected: false,
          message: `Falha na conexão: ${(err as Error).message}`,
        });
      }
    }

    if (action === 'reset') {
      await saveStoredDataLocal(INITIAL_DATABASE_DATA);

      if (supabase) {
        try {
          await supabase.from(SUPABASE_CONFIG.tableName).upsert({
            id: 'current',
            data: INITIAL_DATABASE_DATA,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Mantém dados locais
        }
      }

      return NextResponse.json({
        success: true,
        data: INITIAL_DATABASE_DATA,
        message: 'Dados restaurados com sucesso',
      });
    }

    if (action === 'save_all' && body.data) {
      const updatedData: DatabaseSchema = {
        ...body.data,
        configuracoes: {
          ...body.data.configuracoes,
          ultimaAtualizacao: new Date().toISOString(),
        },
      };

      // Sempre grava localmente para tolerância a falhas
      await saveStoredDataLocal(updatedData);

      let syncedToSupabase = false;
      let supaError: string | null = null;

      if (supabase) {
        try {
          const { error } = await supabase.from(SUPABASE_CONFIG.tableName).upsert({
            id: 'current',
            data: updatedData,
            updated_at: new Date().toISOString(),
          });

          if (!error) {
            syncedToSupabase = true;
          } else {
            supaError = error.message;
          }
        } catch (err) {
          supaError = (err as Error).message;
        }
      }

      return NextResponse.json({
        success: true,
        data: updatedData,
        syncedToSupabase,
        supaError,
      });
    }

    return NextResponse.json({ success: false, error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
