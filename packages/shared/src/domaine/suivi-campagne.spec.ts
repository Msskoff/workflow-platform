import { peutTransitionner } from './commun';
import {
  PREVU_VIDE,
  modifierDecisionSchema,
  statutsDecision,
  transitionsStatutDecision,
  type Decision,
  type StatutDecision,
} from './decision';
import { calculerIndicateursSuivi, ecartPourcent, ecartsDecision } from './suivi-campagne';

const transitions = transitionsStatutDecision;

function decision({
  statut,
  prevu = {},
  reel = null,
}: {
  statut: StatutDecision;
  prevu?: Partial<Decision['prevu']>;
  reel?: Partial<NonNullable<Decision['reel']>> | null;
}): Decision {
  const date = '2026-09-30T10:00:00.000Z';
  return {
    id: `d-${Math.random()}`,
    executionId: 'e1',
    noeudIds: ['regles'],
    explication: 'Parce que.',
    recommandation: 'Faire.',
    priorite: 'normale',
    donnees: null,
    statut,
    valideeLe: null,
    envoyeeLe: null,
    rejeteeLe: null,
    motifRejet: null,
    prevu: { ...PREVU_VIDE, ...prevu },
    reel: reel && {
      produit: null,
      dose: null,
      uniteDose: null,
      date: '2026-10-02',
      cout: null,
      photo: false,
      ...reel,
    },
    appliqueeLe: null,
    applicationDeclareePar: null,
    nonAppliqueeLe: null,
    motifNonApplication: null,
    creeLe: date,
    modifieLe: date,
  };
}

describe('cycle de vie d’une recommandation', () => {
  it('suit brouillon → validé → envoyé → appliqué | non_appliqué', () => {
    expect(peutTransitionner({ transitions, depuis: 'envoyé', vers: 'appliqué' })).toBe(true);
    expect(peutTransitionner({ transitions, depuis: 'envoyé', vers: 'non_appliqué' })).toBe(true);
  });

  it('ne permet de déclarer une application qu’après l’envoi', () => {
    expect(peutTransitionner({ transitions, depuis: 'brouillon', vers: 'appliqué' })).toBe(false);
    expect(peutTransitionner({ transitions, depuis: 'validé', vers: 'appliqué' })).toBe(false);
    expect(peutTransitionner({ transitions, depuis: 'validé', vers: 'non_appliqué' })).toBe(false);
    expect(peutTransitionner({ transitions, depuis: 'rejeté', vers: 'appliqué' })).toBe(false);
  });

  it('permet deux corrections de terrain, et seulement celles-là', () => {
    // Appliquée plus tard, ou case « fait » décochée.
    expect(peutTransitionner({ transitions, depuis: 'non_appliqué', vers: 'appliqué' })).toBe(true);
    expect(peutTransitionner({ transitions, depuis: 'appliqué', vers: 'envoyé' })).toBe(true);
    expect(peutTransitionner({ transitions, depuis: 'appliqué', vers: 'non_appliqué' })).toBe(
      false,
    );
    expect(peutTransitionner({ transitions, depuis: 'non_appliqué', vers: 'envoyé' })).toBe(false);
    expect(peutTransitionner({ transitions, depuis: 'envoyé', vers: 'validé' })).toBe(false);
  });

  it('déclare une table de transitions pour chaque statut', () => {
    expect(Object.keys(transitions).sort()).toEqual([...statutsDecision].sort());
  });

  it('exige une date d’application pour saisir le réel', () => {
    expect(modifierDecisionSchema.safeParse({ reel: { produit: 'Urée' } }).success).toBe(false);
    expect(
      modifierDecisionSchema.safeParse({ reel: { date: '2026-10-02', dose: 80 } }).success,
    ).toBe(true);
  });
});

describe('indicateurs de suivi', () => {
  it('calcule un écart relatif arrondi, nul si le prévu vaut zéro', () => {
    expect(ecartPourcent({ prevu: 100, reel: 112.34 })).toBe(12.3);
    expect(ecartPourcent({ prevu: 0, reel: 5 })).toBeNull();
  });

  it('ne compare les doses qu’à unité identique', () => {
    const memeUnite = decision({
      statut: 'appliqué',
      prevu: { dose: 100, uniteDose: 'kg/ha', coutEstime: 200 },
      reel: { dose: 90, cout: 230 },
    });
    const autreUnite = decision({
      statut: 'appliqué',
      prevu: { dose: 100, uniteDose: 'kg/ha' },
      reel: { dose: 90, uniteDose: 'L/ha' },
    });

    expect(ecartsDecision({ decision: memeUnite })).toEqual({ coutEuros: 30, dosePourcent: -10 });
    expect(ecartsDecision({ decision: autreUnite }).dosePourcent).toBeNull();
  });

  it('compte conseillé, appliqué, reste à faire, et agrège les écarts', () => {
    const indicateurs = calculerIndicateursSuivi({
      decisions: [
        decision({ statut: 'brouillon' }),
        decision({ statut: 'validé' }),
        decision({ statut: 'rejeté' }),
        decision({ statut: 'envoyé' }),
        decision({ statut: 'non_appliqué' }),
        decision({
          statut: 'appliqué',
          prevu: { dose: 100, uniteDose: 'kg/ha', coutEstime: 200 },
          reel: { dose: 110, cout: 250 },
        }),
        decision({
          statut: 'appliqué',
          prevu: { dose: 50, uniteDose: 'L/ha', coutEstime: 100 },
          reel: { dose: 40, cout: 80 },
        }),
        // Appliquée sans réel saisi : compte dans le taux, pas dans les écarts.
        decision({ statut: 'appliqué' }),
      ],
    });

    expect(indicateurs).toEqual({
      conseillees: 5,
      appliquees: 3,
      nonAppliquees: 1,
      aFaire: 1,
      enPreparation: 2,
      tauxApplicationPourcent: 60,
      coutPrevu: 300,
      coutReel: 330,
      ecartCoutPourcent: 10,
      decisionsComparablesCout: 2,
      // (+10 % − 20 %) / 2
      ecartDoseMoyenPourcent: -5,
      decisionsComparablesDose: 2,
    });
  });

  it('renvoie des indicateurs vides pour une campagne sans conseil', () => {
    const indicateurs = calculerIndicateursSuivi({
      decisions: [decision({ statut: 'brouillon' })],
    });

    expect(indicateurs).toMatchObject({
      conseillees: 0,
      tauxApplicationPourcent: null,
      ecartCoutPourcent: null,
      ecartDoseMoyenPourcent: null,
    });
  });
});
