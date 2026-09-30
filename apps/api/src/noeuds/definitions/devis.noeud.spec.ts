import { executerNoeud } from '../../test/noeuds';
import { noeudDevis } from './devis.noeud';

describe('Devis', () => {
  it('multiplie la surface par le tarif de chaque service actif, puis ajoute frais et TVA', async () => {
    const { devis, totalTtc } = await executerNoeud({
      definition: noeudDevis,
      inputs: { surfaceHa: 14.64 },
    });

    // Services actifs par défaut : 9 + 14 €/ha ; frais fixes 50 € ; TVA 20 %.
    expect(devis.lignes).toEqual([
      {
        service: 'Cartographie de vigueur (NDVI)',
        quantiteHa: 14.64,
        tarifHtParHa: 9,
        montantHt: 131.76,
      },
      {
        service: 'Zonage et préconisation de modulation',
        quantiteHa: 14.64,
        tarifHtParHa: 14,
        montantHt: 204.96,
      },
    ]);
    expect(devis).toMatchObject({
      totalHt: 386.72,
      montantTva: 77.34,
      totalTtc: 464.06,
      devise: 'EUR',
    });
    expect(totalTtc).toBe(464.06);
  });

  it('facture au moins la surface minimale', async () => {
    const { devis } = await executerNoeud({
      definition: noeudDevis,
      inputs: { surfaceHa: 2 },
      params: {
        services: [{ libelle: 'Diagnostic', tarifHtParHa: 10 }],
        fraisFixesHt: 0,
        surfaceMinimaleHa: 5,
        tauxTvaPourcent: 0,
      },
    });

    expect(devis).toMatchObject({ surfaceHa: 2, surfaceFactureeHa: 5, totalHt: 50, totalTtc: 50 });
  });
});
