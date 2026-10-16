import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Qui est connecté — sans aller le demander à Supabase.
 *
 * `auth.getUser()` part interroger le serveur d'authentification à chaque
 * appel. Une navigation en faisait trois : le garde-route, la mise en page
 * de l'application, puis la page elle-même. Trois allers-retours distants
 * avant qu'une seule ligne de contenu ne soit lue — et c'est ce qui se
 * voyait le plus dans les trois secondes d'attente entre deux pages.
 *
 * Le projet signe ses jetons avec une clé asymétrique (ES256). Dans ce
 * cas `getClaims()` vérifie la signature SUR PLACE, avec la clé publique
 * mise en cache : aucune requête réseau, et la garantie reste la même —
 * un jeton forgé ou modifié est rejeté. C'est seulement avec un secret
 * symétrique que la méthode retomberait sur un appel distant.
 *
 * Ce qu'elle ne fait pas : rafraîchir un jeton expiré. C'est le travail
 * du garde-route, qui s'en charge une fois par requête et réécrit les
 * témoins. Partout ailleurs, le jeton est déjà frais.
 */

export interface UtilisateurConnecte {
  id: string;
  email: string | null;
}

export async function utilisateurConnecte(
  supabase: SupabaseClient,
): Promise<UtilisateurConnecte | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
