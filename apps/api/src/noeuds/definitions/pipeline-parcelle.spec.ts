import type { GrapheWorkflow } from '@workflow/shared';
import { executerWorkflow, type ObservateurExecution } from '../../moteur/moteur-execution';
import { lireExemple, lireExempleJson } from '../../test/noeuds';
import { creerRegistreNoeuds } from '../registre-noeuds';

const observateurSilencieux: ObservateurExecution = {
  noeudDemarre: async () => undefined,
  noeudTermine: async () => undefined,
  noeudEchoue: async () => undefined,
};

describe('Pipeline de parcelle (moteur + 4 nœuds)', () => {
  it('Import GPS → Reprojection → Contrôle qualité ← Formulaire terrain', async () => {
    const graphe: GrapheWorkflow = {
      variables: [],
      noeuds: [
        { id: 'qc', type: 'standardisation.controle_qualite', parametres: {} },
        {
          id: 'gps',
          type: 'collecte.import_gps',
          parametres: {
            contenu: lireExemple({ nom: 'parcelle-trace.csv' }),
            nomFichier: 'parcelle-trace.csv',
          },
        },
        { id: 'l93', type: 'standardisation.reprojection', parametres: { crsCible: 'EPSG:2154' } },
        {
          id: 'terrain',
          type: 'collecte.formulaire_terrain',
          parametres: lireExempleJson({ nom: 'formulaire-complet.json' }) as Record<string, never>,
        },
      ],
      connexions: [
        { id: 'c1', source: 'gps', sourcePort: 'geometrie', cible: 'l93', ciblePort: 'geometrie' },
        { id: 'c2', source: 'l93', sourcePort: 'geometrie', cible: 'qc', ciblePort: 'geometrie' },
        {
          id: 'c3',
          source: 'terrain',
          sourcePort: 'formulaire',
          cible: 'qc',
          ciblePort: 'formulaire',
        },
      ],
    };

    const resultat = await executerWorkflow({
      graphe,
      registre: creerRegistreNoeuds(),
      contexte: { executionId: 'exe', campagneId: 'cam' },
      observateur: observateurSilencieux,
    });

    expect(resultat.statut).toBe('ok');
    if (resultat.statut !== 'ok') {
      return;
    }
    expect(resultat.sorties.l93?.geometrie).toMatchObject({ crs: 'EPSG:2154' });
    expect(resultat.sorties.qc).toMatchObject({
      conforme: true,
      rapport: { erreurs: [], indicateurs: { nombreSommets: 6 } },
    });
  });
});
