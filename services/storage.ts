import { Session } from '@supabase/supabase-js';
import { NicheConfig, Project } from '../types';
import { supabase } from './supabaseClient';

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required for this action') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export type StorageOptions = {
  useRemote?: boolean;
};

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

const ensureSession = async (): Promise<Session | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Unable to fetch auth session', error.message);
    return null;
  }

  return data.session;
};

async function readFromSupabase<T>(name: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;

  const session = await ensureSession();
  if (!session) {
    throw new AuthRequiredError();
  }

  try {
    const { data, error } = await supabase
      .from('collections')
      .select('data')
      .eq('name', name)
      .single();

    if (error) {
      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        throw new AuthRequiredError(error.message);
      }
      console.warn('Supabase fetch failed', error.message);
      return fallback;
    }

    if (!data || data.data === undefined || data.data === null) {
      return fallback;
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof AuthRequiredError) throw error;
    console.warn('Supabase fetch failed', error);
    return fallback;
  }
}

async function saveToSupabase<T>(name: string, payload: T): Promise<void> {
  if (!supabase) return;

  const session = await ensureSession();
  if (!session) {
    throw new AuthRequiredError();
  }

  try {
    const { error } = await supabase
      .from('collections')
      .upsert({ name, data: payload }, { onConflict: 'name' });

    if (error) {
      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        throw new AuthRequiredError(error.message);
      }
      console.warn('Supabase save failed', error.message);
    }
  } catch (error) {
    if (error instanceof AuthRequiredError) throw error;
    console.warn('Supabase save failed', error);
  }
}

export async function loadNiches(
  fallback: NicheConfig[],
  options: StorageOptions = { useRemote: true }
): Promise<NicheConfig[]> {
  const useRemote = options.useRemote ?? true;
  if (!useRemote) {
    return readLocal('tubeScript_niches', fallback);
  }

  const fromSupabase = await readFromSupabase<NicheConfig[]>('niches', fallback);
  persistLocal('tubeScript_niches', fromSupabase);
  return fromSupabase && fromSupabase.length
    ? fromSupabase
    : readLocal('tubeScript_niches', fallback);
}

export async function saveNiches(
  items: NicheConfig[],
  options: StorageOptions = { useRemote: true }
): Promise<void> {
  const useRemote = options.useRemote ?? true;
  persistLocal('tubeScript_niches', items);
  if (!useRemote) {
    return;
  }
  await saveToSupabase('niches', items);
}

export async function loadProjects(
  options: StorageOptions = { useRemote: true }
): Promise<Project[]> {
  const fallback: Project[] = [];
  if (!options.useRemote) {
    return readLocal('tubeScript_projects', fallback);
  }
  const fromSupabase = await readFromSupabase<Project[]>('projects', fallback);
  persistLocal('tubeScript_projects', fromSupabase);
  return fromSupabase && fromSupabase.length
    ? fromSupabase
    : readLocal('tubeScript_projects', fallback);
}

export async function saveProjects(
  items: Project[],
  options: StorageOptions = { useRemote: true }
): Promise<void> {
  const useRemote = options.useRemote ?? true;
  persistLocal('tubeScript_projects', items);
  if (!useRemote) {
    return;
  }
  await saveToSupabase('projects', items);
}
