import type { Devis } from '@workflow/shared';

export interface ServiceTarife {
  libelle: string;
  tarifHtParHa: number;
  actif: boolean;
}

interface CalculerDevisParams {
  surfaceHa: number;
  services: readonly ServiceTarife[];
  fraisFixesHt: number;
  tauxTvaPourcent: number;
  /** Surface minimale facturée, en ha. */
  surfaceMinimaleHa: number;
}

function euros({ montant }: { montant: number }): number {
  return Math.round(montant * 100) / 100;
}

/** Devis indicatif : surface (au moins le minimum) × tarif de chaque service actif, + frais fixes. */
export function calculerDevis({
  surfaceHa,
  services,
  fraisFixesHt,
  tauxTvaPourcent,
  surfaceMinimaleHa,
}: CalculerDevisParams): Devis {
  const surfaceFactureeHa = Math.round(Math.max(surfaceHa, surfaceMinimaleHa) * 100) / 100;
  const lignes = services
    .filter((service) => service.actif)
    .map((service) => ({
      service: service.libelle,
      quantiteHa: surfaceFactureeHa,
      tarifHtParHa: service.tarifHtParHa,
      montantHt: euros({ montant: surfaceFactureeHa * service.tarifHtParHa }),
    }));
  const totalHt = euros({
    montant: lignes.reduce((total, ligne) => total + ligne.montantHt, 0) + fraisFixesHt,
  });
  const montantTva = euros({ montant: (totalHt * tauxTvaPourcent) / 100 });

  return {
    surfaceHa,
    surfaceFactureeHa,
    lignes,
    fraisFixesHt: euros({ montant: fraisFixesHt }),
    totalHt,
    tauxTvaPourcent,
    montantTva,
    totalTtc: euros({ montant: totalHt + montantTva }),
    devise: 'EUR',
  };
}
