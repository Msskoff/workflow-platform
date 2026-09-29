import { calculerEmpreinte } from '../common/empreinte';
import { causeSqlite } from '../common/erreurs';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { capturerErreur } from '../test/capturer-erreur';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { DonneesBrutesService } from './donnees-brutes.service';

describe('DonneesBrutesService', () => {
  let base: BaseDeTest;
  let service: DonneesBrutesService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new DonneesBrutesService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('importe le contenu tel quel avec son empreinte SHA-256', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const contenu = { humiditeSol: 18, observateur: 'Camille', date: '2026-04-02' };

    const donnee = await service.importer({
      donnees: { campagneId: campagne.id, type: 'formulaire_terrain', source: 'form-42', contenu },
    });

    expect(donnee.contenu).toEqual(contenu);
    expect(donnee.empreinte).toBe(calculerEmpreinte({ valeur: contenu }));
    expect(await service.lister({ filtre: { campagneId: campagne.id } })).toHaveLength(1);
  });

  it("n'expose aucune méthode de modification ni de suppression", () => {
    expect('modifier' in service).toBe(false);
    expect('supprimer' in service).toBe(false);
  });

  it('est protégée par la base : modification et suppression rejetées', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const donnee = await service.importer({
      donnees: {
        campagneId: campagne.id,
        type: 'gps',
        source: 'trace.gpx',
        contenu: [[1.2, 45.3]],
      },
    });

    const modification = await capturerErreur({
      promesse: base.prisma.donneeBrute.update({
        where: { id: donnee.id },
        data: { source: 'falsifié' },
      }),
    });
    const suppression = await capturerErreur({
      promesse: base.prisma.donneeBrute.delete({ where: { id: donnee.id } }),
    });

    expect(causeSqlite({ erreur: modification })).toMatchObject({
      originalCode: 'SQLITE_CONSTRAINT_TRIGGER',
      originalMessage: 'DonneeBrute est immuable : modification interdite',
    });
    expect(causeSqlite({ erreur: suppression }).originalMessage).toMatch(/suppression interdite/);
    expect(await service.trouver({ id: donnee.id })).toEqual(donnee);
  });
});
