import { formulaireTerrainSchema } from '@workflow/shared';
import { executerNoeud, lireExempleJson } from '../../test/noeuds';
import { noeudFormulaireTerrain } from './formulaire-terrain.noeud';

describe('Formulaire terrain', () => {
  it('normalise une saisie complète (historique trié, photos sans image)', async () => {
    const { formulaire } = await executerNoeud({
      definition: noeudFormulaireTerrain,
      params: lireExempleJson({ nom: 'formulaire-complet.json' }),
    });

    expect(formulaireTerrainSchema.safeParse(formulaire).success).toBe(true);
    expect(formulaire).toMatchObject({
      culture: "Blé tendre d'hiver",
      typeSol: 'limoneux',
      irrigation: { irriguee: true, systeme: 'enrouleur', volumeAnnuelM3Ha: 800 },
      historique: [
        { annee: 2025, culture: 'Orge de printemps', rendementTHa: 6.8 },
        { annee: 2024, culture: 'Colza', rendementTHa: 3.6 },
      ],
      photos: [{ nom: 'IMG_2031.jpg', latitude: 48.4415, legende: 'Levée homogène côté nord' }],
    });
  });

  it('transforme les champs vides en « non renseigné » (null)', async () => {
    const { formulaire } = await executerNoeud({ definition: noeudFormulaireTerrain });

    expect(formulaire).toEqual({
      culture: null,
      typeSol: null,
      irrigation: { irriguee: null, systeme: null, volumeAnnuelM3Ha: null },
      historique: [],
      photos: [],
      observations: null,
    });
  });

  it('refuse des paramètres hors bornes (année, coordonnées de photo)', () => {
    const resultat = noeudFormulaireTerrain.parametres.safeParse({
      historique: [{ annee: 1850, culture: 'Blé' }],
      photos: [{ nom: 'a.jpg', latitude: 120 }],
    });

    expect(resultat.success).toBe(false);
  });
});
