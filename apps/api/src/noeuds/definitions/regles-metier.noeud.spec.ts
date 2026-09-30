import type { RegleMetier } from '@workflow/shared';
import { executerNoeud } from '../../test/noeuds';
import { noeudReglesMetier } from './regles-metier.noeud';

function regle({ id, ...champs }: Partial<RegleMetier> & { id: string }): RegleMetier {
  return {
    id,
    nom: `Règle ${id}`,
    active: true,
    indicateur: 'ndviMoyen',
    operateur: '<',
    seuil: 0.5,
    recommandation: 'Programmer un tour de plaine.',
    explication: 'Le {indicateur} vaut {valeur}, sous le seuil de {seuil}.',
    priorite: 'normale',
    ...champs,
  };
}

describe('Règles métier', () => {
  it('produit une décision expliquée et motivée pour chaque règle déclenchée', async () => {
    const { decisions, nombreDecisions } = await executerNoeud({
      definition: noeudReglesMetier,
      inputs: { indicateurs: [{ ndviMoyen: 0.4213 }, { surfaceHa: 14.64 }] },
      params: {
        regles: [
          regle({ id: 'vigueur', priorite: 'haute' }),
          regle({ id: 'grande', indicateur: 'surfaceHa', operateur: '>', seuil: 20 }),
        ],
      },
    });

    expect(nombreDecisions).toBe(1);
    expect(decisions.nombreEvaluees).toBe(2);
    expect(decisions.declenchees).toEqual([
      {
        regleId: 'vigueur',
        regleNom: 'Règle vigueur',
        priorite: 'haute',
        recommandation: 'Programmer un tour de plaine.',
        explication: 'Le ndvi moyen vaut 0,421, sous le seuil de 0,5.',
        motif: { indicateur: 'ndviMoyen', valeur: 0.4213, operateur: '<', seuil: 0.5 },
      },
    ]);
  });

  it('fusionne les indicateurs reçus, la dernière connexion l’emportant', async () => {
    const { decisions } = await executerNoeud({
      definition: noeudReglesMetier,
      inputs: { indicateurs: [{ ndviMoyen: 0.9 }, { ndviMoyen: 0.3 }] },
      params: { regles: [regle({ id: 'vigueur' })] },
    });

    expect(decisions.declenchees[0]?.motif.valeur).toBe(0.3);
  });

  it('ignore les règles inactives et signale un indicateur absent', async () => {
    const { decisions } = await executerNoeud({
      definition: noeudReglesMetier,
      inputs: { indicateurs: [{ surfaceHa: 3 }] },
      params: {
        regles: [
          regle({
            id: 'inactive',
            indicateur: 'surfaceHa',
            operateur: '>',
            seuil: 1,
            active: false,
          }),
          regle({ id: 'sans-ndvi' }),
        ],
      },
    });

    expect(decisions.declenchees).toEqual([]);
    expect(decisions.ignorees).toEqual([
      expect.objectContaining({ regleId: 'sans-ndvi', raison: expect.stringMatching(/ndviMoyen/) }),
    ]);
  });

  it('évalue chaque opérateur, avec une égalité tolérante', async () => {
    const operateurs = ['<', '<=', '>', '>=', '=', '!='] as const;
    const { decisions } = await executerNoeud({
      definition: noeudReglesMetier,
      inputs: { indicateurs: [{ ndviMoyen: 0.1 + 0.2 }] },
      params: {
        regles: operateurs.map((operateur) => regle({ id: operateur, operateur, seuil: 0.3 })),
      },
    });

    expect(decisions.declenchees.map((decision) => decision.regleId)).toEqual(['<=', '>=', '=']);
  });

  it('refuse une règle incomplète ou une explication sur plusieurs lignes', () => {
    const resultat = noeudReglesMetier.parametres.safeParse({
      regles: [regle({ id: 'a', nom: '' }), regle({ id: 'b', explication: 'Ligne 1.\nLigne 2.' })],
    });

    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'regles.0.nom',
      'regles.1.explication',
    ]);
  });
});
