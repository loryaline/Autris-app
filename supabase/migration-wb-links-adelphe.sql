-- Fratrie : frère / sœur → adelphe
--
-- Une relation de fratrie s'affiche sur le plateau avec une pointe de
-- flèche à chaque bout, parce qu'elle se lit pareil des deux côtés. Avec
-- un mot genré, cette double pointe devient illisible : « sœur » entre
-- deux fiches, c'est la sœur de qui ? Le genre appartient au personnage,
-- pas au lien qui les unit.
--
-- Les mots genrés restent reconnus par le code (réciprocité, dépliage
-- généalogique) : cette migration n'est donc pas obligatoire, elle
-- harmonise l'existant.

update wb_links
set link_type = 'adelphe'
where link_type in ('frère', 'sœur');

update wb_links
set link_type = 'demi-adelphe'
where link_type in ('demi-frère', 'demi-sœur');

-- Même raison pour l'union et le cousinage.
update wb_links
set link_type = 'mariés'
where link_type in ('époux', 'épouse');

update wb_links
set link_type = 'cousinage'
where link_type in ('cousin', 'cousine');

-- Filiation : le lien est le même quel que soit le genre de qui le porte.
update wb_links
set link_type = 'parent'
where link_type in ('père', 'mère');

update wb_links
set link_type = 'enfant'
where link_type in ('fils', 'fille');

-- Le passage à un mot unique peut faire apparaître d'anciens doublons
-- réciproques : « A adelphe de B » ET « B adelphe de A », qui énoncent
-- le même fait. On ne garde que le plus ancien de chaque paire.
delete from wb_links a
using wb_links b
where a.link_type in ('adelphe', 'demi-adelphe')
  and a.link_type = b.link_type
  and a.from_entry_id = b.to_entry_id
  and a.to_entry_id = b.from_entry_id
  and a.created_at > b.created_at;
