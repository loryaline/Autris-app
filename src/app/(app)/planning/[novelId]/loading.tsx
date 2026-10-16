/* Planification — frontière de chargement.
   Sans ce fichier, le routeur reste sur la page précédente, figée, le
   temps que les requêtes aboutissent : cf. PageSkeleton. */
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function Loading() {
  return <PageSkeleton titleWidth={240} blocks={2} />;
}
