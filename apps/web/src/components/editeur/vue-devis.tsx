import type { Devis } from '@workflow/shared';

function euros({ montant }: { montant: number }): string {
  return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

interface VueDevisProps {
  devis: Devis;
}

/** Devis indicatif : lignes par service, frais fixes, TVA et total. */
export function VueDevis({ devis }: VueDevisProps) {
  return (
    <div className="space-y-1 text-xs">
      <p className="text-[11px] text-neutral-500">
        Surface facturée : {devis.surfaceFactureeHa.toLocaleString('fr-FR')} ha
        {devis.surfaceFactureeHa > devis.surfaceHa && ' (minimum facturable)'}
      </p>
      <table className="w-full">
        <tbody>
          {devis.lignes.map((ligne) => (
            <tr key={ligne.service}>
              <td className="py-0.5 pr-2">
                {ligne.service}
                <span className="block text-[10px] text-neutral-500">
                  {ligne.quantiteHa.toLocaleString('fr-FR')} ha ×{' '}
                  {euros({ montant: ligne.tarifHtParHa })}
                </span>
              </td>
              <td className="text-right font-mono">{euros({ montant: ligne.montantHt })}</td>
            </tr>
          ))}
          {devis.fraisFixesHt > 0 && (
            <tr>
              <td className="py-0.5">Frais fixes</td>
              <td className="text-right font-mono">{euros({ montant: devis.fraisFixesHt })}</td>
            </tr>
          )}
          <tr className="border-t border-neutral-200">
            <td className="pt-1">Total HT</td>
            <td className="pt-1 text-right font-mono">{euros({ montant: devis.totalHt })}</td>
          </tr>
          <tr>
            <td>TVA {devis.tauxTvaPourcent.toLocaleString('fr-FR')} %</td>
            <td className="text-right font-mono">{euros({ montant: devis.montantTva })}</td>
          </tr>
          <tr className="font-semibold">
            <td>Total TTC</td>
            <td className="text-right font-mono" data-total-ttc={devis.totalTtc}>
              {euros({ montant: devis.totalTtc })}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-neutral-400">
        Devis indicatif : aucune facturation n’est émise.
      </p>
    </div>
  );
}
