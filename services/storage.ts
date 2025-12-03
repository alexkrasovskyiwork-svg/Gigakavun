import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NicheConfig, Project } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const persistLocal = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Local save failed', error);
  }
};

const readLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn('Local read failed', error);
    return fallback;
  }
};

async function readFromSupabase<T>(name: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('data')
      .eq('name', name)
      .single();

    if (error) {
      console.warn('Supabase fetch failed', error.message);
      return fallback;
    }

    if (!data || data.data === undefined || data.data === null) {
      return fallback;
    }

    return data.data as T;
  } catch (error) {
    console.warn('Supabase fetch failed', error);
    return fallback;
  }
}

async function saveToSupabase<T>(name: string, payload: T): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('collections')
      .upsert({ name, data: payload }, { onConflict: 'name' });

    if (error) {
      console.warn('Supabase save failed', error.message);
    }
  } catch (error) {
    console.warn('Supabase save failed', error);
  }
}

export async function loadNiches(fallback: NicheConfig[]): Promise<NicheConfig[]> {
  const fromSupabase = await readFromSupabase<NicheConfig[]>('niches', fallback);
  persistLocal('tubeScript_niches', fromSupabase);
  return fromSupabase && fromSupabase.length
    ? fromSupabase
    : readLocal('tubeScript_niches', fallback);
}

export async function saveNiches(items: NicheConfig[]): Promise<void> {
  persistLocal('tubeScript_niches', items);
  await saveToSupabase('niches', items);
}

export async function loadProjects(): Promise<Project[]> {
  const fallback: Project[] = [];
  const fromSupabase = await readFromSupabase<Project[]>('projects', fallback);
  persistLocal('tubeScript_projects', fromSupabase);
  return fromSupabase && fromSupabase.length
    ? fromSupabase
    : readLocal('tubeScript_projects', fallback);
}

export async function saveProjects(items: Project[]): Promise<void> {
  persistLocal('tubeScript_projects', items);
  await saveToSupabase('projects', items);
}
