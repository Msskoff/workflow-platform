import { NotFoundException } from '@nestjs/common';
import { DecisionsService } from '../decisions/decisions.service';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { executerDiagnostic } from '../test/diagnostic';
import { creerExecutionTerminee, creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { genererRapportPdf } from './generer-rapport-pdf';
import { RapportsService } from './rapports.service';

describe('RapportsService', () => {
  let base: BaseDeTest;
  let rapports: RapportsService;
  let decisions: DecisionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    rapports = new RapportsService(base.prisma);
    decisions = new DecisionsService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('retient les décisions validées pour l’aperçu, envoyées seulement pour le client', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const execution = await executerDiagnostic({ prisma: base.prisma, campagneId: campagne.id });
    const produites = await decisions.lister({ filtre: { executionId: execution.id } });
    // Les 4 règles du diagnostic se déclenchent sur l'image d'exemple.
    expect(produites).toHaveLength(4);
    const [premiere, deuxieme, troisieme] = produites;
    for (const decision of [premiere, deuxieme, troisieme]) {
      await decisions.modifier({ id: decision?.id ?? '', donnees: { statut: 'validé' } });
    }
    await decisions.modifier({ id: premiere?.id ?? '', donnees: { statut: 'envoyé' } });

    const apercu = await rapports.preparer({
      executionId: execution.id,
      statuts: ['validé', 'envoyé'],
      destination: 'apercu',
    });
    const client = await rapports.preparer({
      executionId: execution.id,
      statuts: ['envoyé'],
      destination: 'client',
    });

    expect(apercu.donnees.decisions).toHaveLength(3);
    // La décision prioritaire (zone faible, « haute ») vient en premier.
    expect(apercu.donnees.decisions[0]?.priorite).toBe('haute');
    expect(client.donnees.decisions).toEqual([
      expect.objectContaining({ explication: premiere?.explication }),
    ]);
    expect(client.nomFichier).toMatch(/^rapport-les-grands-champs-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(apercu.donnees.rapport.devis?.totalTtc).toBeGreaterThan(0);
  });

  it('produit un PDF valide, avec ou sans décisions', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const execution = await executerDiagnostic({ prisma: base.prisma, campagneId: campagne.id });
    const { donnees } = await rapports.preparer({
      executionId: execution.id,
      statuts: ['validé', 'envoyé'],
      destination: 'apercu',
    });

    const vide = await genererRapportPdf({ donnees, compresser: false });
    const complet = await genererRapportPdf({
      donnees: {
        ...donnees,
        decisions: [
          {
            recommandation: 'Moduler l’azote.',
            explication: 'La vigueur varie.',
            priorite: 'normale',
          },
        ],
      },
      compresser: false,
    });

    const nombrePages = (pdf: Buffer) => pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length;
    for (const pdf of [vide, complet]) {
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      // Carte et recommandations en page 1, devis en page 2 ; pas de page blanche
      // créée par les pieds de page (écrits sous la marge basse).
      expect(nombrePages(pdf)).toBe(2);
    }
    expect(complet.length).toBeGreaterThan(vide.length);
  });

  it('refuse une exécution sans nœud Rapport PDF', async () => {
    const { executionId } = await creerExecutionTerminee({ prisma: base.prisma });

    await expect(rapports.apercu({ executionId })).rejects.toThrow(NotFoundException);
  });
});
