-- Seed : fiche-lexique Estenien (langue divine).
-- Reproduit la structure du markdown source dans le nouveau LEXICON_TEMPLATE
-- (Nature / Phonétique / Grammaire / Vocabulaire / Noms propres / Utilisations).
--
-- Usage : remplacer la valeur de v_project_id ci-dessous par l'UUID du projet
-- cible, puis exécuter dans l'éditeur SQL Supabase.

DO $$
DECLARE
  -- Par défaut : projet le plus récent de l'utilisateur connecté.
  -- Pour cibler un projet précis, remplacer par :
  --   v_project_id uuid := (SELECT id FROM public.projects WHERE title = 'Mon projet');
  v_project_id uuid := (SELECT id FROM public.projects ORDER BY created_at DESC LIMIT 1);
  v_user_id uuid;
BEGIN
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Aucun projet trouvé — crée d''abord un projet dans Autris.';
  END IF;

  SELECT user_id INTO v_user_id FROM public.projects WHERE id = v_project_id;
  INSERT INTO public.wb_entries (
    project_id,
    user_id,
    category,
    subcategory,
    title,
    description,
    status,
    template_data
  ) VALUES (
    v_project_id,
    v_user_id,
    'lexique_langage',
    NULL,
    'Estenien',
    'Langue divine, transmise par vibration et souffle, non conçue pour la conversation ordinaire. Elle est utilisée pour nommer, invoquer, sceller, maudire ou créer. Chaque mot possède une valeur symbolique.',
    'valide',
    jsonb_build_object(
      'nature',
      E'Langue divine, transmise par vibration et souffle, non conçue pour la conversation ordinaire.\nUtilisée pour nommer, invoquer, sceller, maudire ou créer.\nSystème sonore et écrit sacré : chaque mot possède une valeur symbolique.',

      'phonetique', jsonb_build_array(
        jsonb_build_array('Voyelles', 'a, e, i, o, u, ae, ei, io (souvent longues)'),
        jsonb_build_array('Consonnes', 'm, n, l, r, v, s, h, f (très peu de t/d/k/p)'),
        jsonb_build_array('Accentuation', 'Dernière voyelle pleine'),
        jsonb_build_array('Tonalité', 'Chantante, ondulante, comme une vibration sacrée'),
        jsonb_build_array('Écriture', 'Alphabet sacré (glyphes 𐌀𐌁𐌂…), direction circulaire ou verticale descendante')
      ),

      'grammaire_regles',
      E'Ordre : Sujet – Objet – Verbe (SOV), inspiré du coréen.\nLes fonctions grammaticales sont portées par des particules suffixées au nom ou au verbe.\nLa négation se forme par le préfixe « ne- » devant le verbe.',

      'grammaire_particules', jsonb_build_array(
        jsonb_build_array('Sujet',    '–ia', 'Déos-ia vérua-en déra',  'Le dieu parle la parole sacrée'),
        jsonb_build_array('Objet',    '–en', 'Luhéa-en améra',          'Il aime la lumière'),
        jsonb_build_array('Lieu',     '–el', 'Téria-el esta',           'Il est sur la Terre'),
        jsonb_build_array('Temps',    '–or', 'Noctu-or véla',           'Il invoque la nuit'),
        jsonb_build_array('Négation', 'ne-', 'Ne-déra vérua-en',        'Il ne dit pas la parole')
      ),

      'vocabulaire', jsonb_build_array(
        jsonb_build_array('Améra',     'Aimer',                        'Élan d''unité divine'),
        jsonb_build_array('Véla',      'Invoquer / appeler',           'Appel sacré'),
        jsonb_build_array('Luhéa',     'Lumière',                      'Révélation cosmique'),
        jsonb_build_array('Déos',      'Dieu',                         'Être primordial'),
        jsonb_build_array('Móren',     'Mort',                         'Passage sacré'),
        jsonb_build_array('Téria',     'Terre / Monde',                'Domaine du vivant'),
        jsonb_build_array('Vérai',     'Vérité',                       'Harmonie divine'),
        jsonb_build_array('Esta',      'Être',                         'Existence sacrée'),
        jsonb_build_array('Déra',      'Dire / Parler',                'Acte de création (Verbe primordial)'),
        jsonb_build_array('Selaï',     'Ciel / divinité haute',        'Domaine de l''origine'),
        jsonb_build_array('Valkúrën',  'Souillure sacrée',             'Ce qui aurait dû valoir, mais fut souillé'),
        jsonb_build_array('Ga',        'Vie',                          ''),
        jsonb_build_array('Frèra',     'Frère, égal sacré',            'Terme d''unité d''âme'),
        jsonb_build_array('Kaïra',     'Cœur, amour profond',          ''),
        jsonb_build_array('Serën',     'Serment, lien divin',          'Promesse scellée par la parole'),
        jsonb_build_array('Séra',      'Lier, enchaîner, unir',        'Verbe dérivé de Serën'),
        jsonb_build_array('Astraï',    'Étoiles, veilleuses du ciel',  'Pluriel poétique d''astre'),
        jsonb_build_array('Solèn',     'Revenir / renaître lentement', 'Forme douce de ren'),
        jsonb_build_array('Guidëa',    'Guide, éclaireur',             'Associé aux astres'),
        jsonb_build_array('Saren',     'Souvenir, mémoire résonante',  'Chant ancien, écho'),
        jsonb_build_array('Néra',      'Mémoire, esprit du passé',     'Complémentaire à saren'),
        jsonb_build_array('Silen',     'Silence, vide sacré',          'Solitude'),
        jsonb_build_array('Ren',       'Le retour',                    ''),
        jsonb_build_array('Vat',       'Le père',                      ''),
        jsonb_build_array('Filios',    'Le fils',                      '')
      ),

      'noms_propres', jsonb_build_array(
        jsonb_build_array('—',      'Gaea',        '/ˈa.ɛl.ha.ra/',    'Souffle-matrice, origine de tout'),
        jsonb_build_array('Taram',  'Noctharôn',   '/nɔk.ˈtha.rɔn/',   'Seigneur des seuils nocturnes'),
        jsonb_build_array('Estar',  'Irazaël',     '/i.ra.za.ˈɛl/',    'L''éclat de l''Être pur'),
        jsonb_build_array('Gar',    'Ravhagar',    '/ˈrav.ha.gar/',    'Flamme qui rugit, chaos sacré'),
        jsonb_build_array('Milo',   'Suvënai',     '/su.ˈvɛ.na.i/',    'Brise intérieure, paix incarnée'),
        jsonb_build_array('Dastan', 'Elistarûn',   '/e.lis.ta.ˈʁun/',  'Tisseur d''étoile, destin cosmique')
      ),

      'utilisations',
      E'Invocation divine — « Aëlhara-ia vérua-en déra. » (Gaïa prononce le Verbe)\nRituels & chants — écrire les noms en alphabet sacré et les chanter en spirale.\nFormule sacrée — « Suvënai-el esta. » (Il est dans la paix)\nMalédiction divine — « Téria-el valkúrën esta. » (Il y a une souillure sur la Terre)',

      'texte_titre', 'Astraï Ren — Le Retour des Étoiles',

      'texte_traductions', jsonb_build_array(
        jsonb_build_array('— Couplet I : Les Frères —', '', ''),
        jsonb_build_array('Frèra-ia améra-en esta,',       '/ˈfrɛ.ra.ia a.ˈme.ra.ɛn ˈɛs.ta/',    'Les frères furent amour,'),
        jsonb_build_array('Kaïra-el vérua-en déra,',       '/ˈka.i.ra.ɛl ˈve.ru.a.ɛn ˈde.ra/',   'Le cœur parla la parole,'),
        jsonb_build_array('Néra saren, néra saren,',       '/ˈne.ra ˈsa.ren/',                    'Écho du souvenir,'),
        jsonb_build_array('Téria-el luhéa-en véla.',       '/ˈte.ria.ɛl ˈlu.he.a.ɛn ˈve.la/',     'La Terre appela la lumière.'),
        jsonb_build_array('— Couplet II : La Trahison —', '', ''),
        jsonb_build_array('Valkúrën-el moren véla,',       '/val.ˈku.ren.ɛl ˈmo.ren ˈve.la/',     'La souillure invoqua la mort,'),
        jsonb_build_array('Serën-el frèra-en séra,',       '/ˈse.ren.ɛl ˈfrɛ.ra.ɛn ˈse.ra/',      'Le serment lia les frères,'),
        jsonb_build_array('Déos-ia nèra-en ne-déra,',      '/ˈde.os.ia ˈne.ra.ɛn ne.ˈde.ra/',     'Le dieu ne parla plus mémoire,'),
        jsonb_build_array('Silen esta, silen esta.',       '/ˈsi.len ˈɛs.ta, ˈsi.len ˈɛs.ta/',    'Et vint le silence.'),
        jsonb_build_array('— Refrain : Le Retour des Étoiles —', '', ''),
        jsonb_build_array('Astraï-ia vérua-en déra,',      '/ˈas.trai.ia ˈve.ru.a.ɛn ˈde.ra/',    'Les étoiles dirent le Verbe,'),
        jsonb_build_array('Selaï-el vérai-en esta,',       '/se.ˈlai.ɛl ˈve.rai.ɛn ˈɛs.ta/',      'Dans le ciel réside la vérité,'),
        jsonb_build_array('Solèn ren, solèn ren,',         '/so.ˈlɛn ˈrɛn/',                      'Le retour inlassable,'),
        jsonb_build_array('Guidëa saren, guidëa saren.',   '/ˈgi.de.a ˈsa.ren/',                  'Guide de la mémoire.')
      )
    )
  );
END $$;
