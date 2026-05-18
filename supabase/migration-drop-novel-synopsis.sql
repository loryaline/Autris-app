-- Migration: suppression de la colonne orpheline novels.synopsis
--
-- Cette colonne (migration-novel-synopsis.sql) a été remplacée par la
-- table `synopses` (migration-synopses.sql), qui gère plusieurs synopsis
-- par roman. Elle n'est plus ni lue ni écrite par l'application.
--
-- À n'exécuter qu'après avoir appliqué migration-synopses.sql.

ALTER TABLE public.novels DROP COLUMN IF EXISTS synopsis;
