import { validerWorkflow } from '../noeuds/validation';
import {
  champsReferencant,
  preparerValeursVariables,
  problemesVariables,
  resoudreParametres,
  variableWorkflowSchema,
  type VariableWorkflow,
} from './variables-workflow';

const VARIABLES: VariableWorkflow[] = [
  {
    nom: 'parcelleId',
    type: 'parcelle',
    libelle: 'Parcelle',
    obligatoire: true,
    valeurParDefaut: null,
  },
  { nom: 'dateDebut', type: 'date', libelle: 'Début', obligatoire: true, valeurParDefaut: null },
  { nom: 'seuil', type: 'nombre', libelle: 'Seuil', obligatoire: false, valeurParDefaut: 0.6 },
  { nom: 'note', type: 'texte', libelle: 'Note', obligatoire: false, valeurParDefaut: null },
];

describe('variables de workflow', () => {
  it('prend la valeur fournie, sinon le défaut, sinon la parcelle de la campagne', () => {
    const { valeurs, erreurs } = preparerValeursVariables({
      variables: VARIABLES,
      fournies: { dateDebut: '2026-05-01', seuil: '0,7' },
      parcelleId: 'p1',
    });

    expect(erreurs).toEqual([]);
    // La note, facultative et sans valeur, reste absente.
    expect(valeurs).toEqual({ parcelleId: 'p1', dateDebut: '2026-05-01', seuil: 0.7 });
  });

  it('signale les variables obligatoires manquantes et les valeurs mal typées', () => {
    const { erreurs } = preparerValeursVariables({
      variables: VARIABLES,
      fournies: { seuil: 'beaucoup' },
    });

    expect(erreurs).toEqual([
      'La variable « Parcelle » (parcelleId) est obligatoire',
      'La variable « Début » (dateDebut) est obligatoire',
      '« seuil » doit être un nombre (reçu : beaucoup)',
    ]);
  });

  it('remplace une référence seule par la valeur typée et interpole le texte', () => {
    const [noeud] = resoudreParametres({
      noeuds: [
        {
          id: 'n1',
          parametres: {
            parcelleId: '${parcelleId}',
            seuil: '${seuil}',
            titre: 'Diagnostic du ${dateDebut}${note}',
            regles: [{ seuil: '${seuil}' }],
            // Référence seule à une variable absente : le paramètre disparaît (défaut du nœud).
            commentaire: '${note}',
          },
        },
      ],
      valeurs: { parcelleId: 'p1', dateDebut: '2026-05-01', seuil: 0.7 },
    });

    expect(noeud?.parametres).toEqual({
      parcelleId: 'p1',
      seuil: 0.7,
      titre: 'Diagnostic du 2026-05-01',
      regles: [{ seuil: 0.7 }],
    });
  });

  it('repère les champs qui référencent une variable', () => {
    expect(
      champsReferencant({ parametres: { a: '${x}', b: 3, c: [{ d: 'avant ${y}' }] } }),
    ).toEqual(['a', 'c']);
  });

  it('refuse une référence à une variable non déclarée, dans la validation du workflow', () => {
    const graphe = {
      noeuds: [{ id: 'n1', type: 'factice.nombre', parametres: { valeur: '${inconnue}' } }],
      connexions: [],
      variables: VARIABLES,
    };

    expect(problemesVariables({ graphe })).toEqual([
      {
        noeudId: 'n1',
        message: "n1 : la variable ${inconnue} n'est pas déclarée dans le workflow",
      },
    ]);
    const erreurs = validerWorkflow({
      graphe,
      catalogue: { 'factice.nombre': { libelle: 'Nombre', entrees: {}, sorties: {} } },
    });
    expect(erreurs.map((erreur) => erreur.code)).toEqual(['variable_inconnue']);
  });

  it('contrôle la valeur par défaut selon le type', () => {
    const base = { nom: 'x', libelle: '', obligatoire: true };
    expect(
      variableWorkflowSchema.safeParse({ ...base, type: 'nombre', valeurParDefaut: 'dix' }).success,
    ).toBe(false);
    expect(
      variableWorkflowSchema.safeParse({ ...base, type: 'fichier', valeurParDefaut: 'abc' })
        .success,
    ).toBe(false);
    expect(
      variableWorkflowSchema.safeParse({ ...base, type: 'date', valeurParDefaut: '2026-05-01' })
        .success,
    ).toBe(true);
  });
});
