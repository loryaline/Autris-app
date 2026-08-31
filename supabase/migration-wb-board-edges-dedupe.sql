-- Flèches en double sur un plateau
--
-- Une même relation tracée deux fois entre les deux mêmes vignettes se
-- superpose au pixel près : le trait paraît normal, mais l'étiquette
-- s'affiche en double. Le rendu n'en montre plus qu'une, ce nettoyage
-- retire les lignes devenues inutiles.

delete from wb_board_edges a
using wb_board_edges b
where a.wb_link_id is not null
  and a.wb_link_id = b.wb_link_id
  and a.board_id = b.board_id
  and a.from_node_id = b.from_node_id
  and a.to_node_id = b.to_node_id
  and a.id > b.id;
