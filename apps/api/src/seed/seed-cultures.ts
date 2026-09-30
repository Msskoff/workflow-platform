import { creerCultureSchema } from '@workflow/shared';
import { CULTURES_EXEMPLE } from '../cultures/cultures-exemple';
import { ModelesService } from '../modeles/modeles.service';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import type { PrismaService } from '../prisma/prisma.service';

export interface BilanSeed {
  creees: string[];
  /** Déjà présentes : laissées telles quelles (elles ont pu être corrigées par un agronome). */
  conservees: string[];
}

/**
 * Seed des cultures d'exemple (maïs, manioc, cacao), puis synchronisation des modèles
 * prédéfinis pour les rattacher à leur culture. Idempotent : une culture existante (même code)
 * n'est jamais écrasée.
 */
export async function seederCultures({ prisma }: { prisma: PrismaService }): Promise<BilanSeed> {
  const bilan: BilanSeed = { creees: [], conservees: [] };
  for (const exemple of CULTURES_EXEMPLE) {
    const culture = creerCultureSchema.parse(exemple);
    const existante = await prisma.culture.findUnique({ where: { code: culture.code } });
    if (existante) {
      bilan.conservees.push(culture.nom);
      continue;
    }
    await prisma.culture.create({ data: culture });
    bilan.creees.push(culture.nom);
  }
  await new ModelesService(prisma, creerRegistreNoeuds()).synchroniserPredefinis();
  return bilan;
}
