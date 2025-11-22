import { supabase } from '@/integrations/supabase/client';

/**
 * Récupère l'ID de l'utilisateur connecté
 * @returns L'UUID de l'utilisateur ou null si non connecté
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Vérifie qu'un utilisateur est connecté et retourne son ID
 * @throws {Error} Si aucun utilisateur n'est connecté
 * @returns L'UUID de l'utilisateur connecté
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Authentification requise. Veuillez vous connecter.');
  }
  
  return userId;
}

/**
 * Vérifie si un utilisateur est connecté (sync)
 * Utile pour des vérifications côté client
 * @returns boolean
 */
export function isAuthenticated(): boolean {
  const session = supabase.auth.getSession();
  return !!session;
}

/**
 * Récupère l'email de l'utilisateur connecté
 * @returns L'email de l'utilisateur ou null
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email ?? null;
}
