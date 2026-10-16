import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /* Qui est connecté, au prix le plus bas possible.

     `getUser()` interroge le serveur d'authentification à chaque requête.
     `getClaims()` vérifie la signature sur place — le projet signe en
     ES256, donc avec une clé publique mise en cache, sans réseau.

     Mais `getClaims()` ne sait pas renouveler un jeton périmé. On ne
     retombe donc sur `getUser()` que dans ce cas précis : lui va chercher
     une session fraîche et réécrit les témoins. Le cas courant ne coûte
     plus rien ; le cas rare coûte ce qu'il coûtait. */
  const { data: revendications } = await supabase.auth.getClaims();
  let user: { id: string } | null = revendications?.claims?.sub
    ? { id: revendications.claims.sub }
    : null;
  if (!user) {
    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
  }

  // If not logged in and trying to access app routes, redirect to login
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isOnboarding = request.nextUrl.pathname.startsWith("/onboarding");
  // Pages légales accessibles sans connexion (mentions, CGU, confidentialité)
  const isLegal = request.nextUrl.pathname.startsWith("/legal");

  if (!user && !isAuthRoute && !isAuthCallback && !isLegal) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in and on auth pages, redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If logged in but onboarding not done, redirect to onboarding.
  // Si le profil est marqué deleted_at (RGPD soft delete), on déconnecte
  // et on renvoie vers /login — quel que soit l'état de l'onboarding.
  /* L'état du profil, revérifié de loin en loin et non à chaque page.

     Cette lecture de `profiles` partait en base à CHAQUE requête — chaque
     navigation, chaque préchargement — pour répondre deux fois sur mille
     autre chose que « ce compte est normal ». C'était le second
     aller-retour distant payé avant que la page ne commence.

     Un témoin de courte durée mémorise la réponse. Dix minutes : assez
     pour que la question ne se pose qu'une fois par visite, assez peu
     pour qu'un compte supprimé entre-temps soit déconnecté sans tarder.
     Les deux bascules qui comptent — fin de l'intégration, suppression du
     compte — effacent ce témoin au moment où elles surviennent. */
  const profilVerifie = request.cookies.get("autris_profil")?.value === "ok";

  if (user && !isAuthRoute && !isAuthCallback && !isOnboarding && !profilVerifie) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_done, deleted_at")
      .eq("id", user.id)
      .single();

    if (profile?.deleted_at) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("deleted", "1");
      return NextResponse.redirect(url);
    }

    if (profile && !profile.onboarding_done) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Compte normal : on s'en souvient, et on cesse de le redemander.
    if (profile) {
      supabaseResponse.cookies.set("autris_profil", "ok", {
        maxAge: 600,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  // If onboarding done but still on /onboarding, redirect to dashboard.
  // Exception : ?redo=1 (« Refaire la configuration » depuis les
  // Paramètres) — on laisse passer même si l'onboarding est terminé.
  const isRedo = request.nextUrl.searchParams.get("redo") === "1";
  if (user && isOnboarding && !isRedo) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_done")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_done) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
