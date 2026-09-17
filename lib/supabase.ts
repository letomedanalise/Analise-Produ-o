import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pjoyltomokbxxvhyvaqr.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqb3lsdG9tb2tieHh2aHl2YXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDUxMjIsImV4cCI6MjEwNDEyMTEyMn0.yMbIz1cEtM-cZybRlQ6lhegFu6WjIHvuEocr9Y5pV4Q';

let serverClient: SupabaseClient | null = null;
let browserClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!serverClient) {
    serverClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}

export const SUPABASE_SQL_SETUP = `-- Script para criar a tabela e liberar acesso no Supabase:
CREATE TABLE IF NOT EXISTS industrial_data (
  id TEXT PRIMARY KEY DEFAULT 'current',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Desativa RLS para leitura e gravação livre da indústria
ALTER TABLE industrial_data DISABLE ROW LEVEL SECURITY;

-- Garante política irrestrita caso o projeto force RLS ativo
DROP POLICY IF EXISTS "Public access" ON industrial_data;
CREATE POLICY "Public access" ON industrial_data FOR ALL TO anon USING (true) WITH CHECK (true);
`;

export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  projectId: 'pjoyltomokbxxvhyvaqr',
  tableName: 'industrial_data',
};
