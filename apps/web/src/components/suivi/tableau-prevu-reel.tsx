import { apiRoutes, ecartsDecision, type Decision } from '@workflow/shared';
import {
  formaterDose,
  formaterEcartPourcent,
  formaterEuros,
  formaterJour,
} from '@/lib/suivi/format-suivi';

const VIDE = '—';

interface TableauPrevuReelProps {
  decision: Decision;
}

/** Prévu et réel côte à côte, avec l'écart sur la dose et le coût. */
export function TableauPrevuReel({ decision }: TableauPrevuReelProps) {
  const { prevu, reel } = decision;
  const ecarts = ecartsDecision({ decision });
  const lignes = [
    {
      libelle: 'Produit',
      prevu: prevu.produit ?? VIDE,
      reel: reel ? (reel.produit ?? VIDE) : VIDE,
      ecart: reel?.produit && prevu.produit && reel.produit !== prevu.produit ? 'Changé' : '',
    },
    {
      libelle: 'Dose',
      prevu:
        prevu.dose === null ? VIDE : formaterDose({ dose: prevu.dose, unite: prevu.uniteDose }),
      reel:
        reel?.dose == null
          ? VIDE
          : formaterDose({ dose: reel.dose, unite: reel.uniteDose ?? prevu.uniteDose }),
      ecart:
        ecarts.dosePourcent === null ? '' : formaterEcartPourcent({ ecart: ecarts.dosePourcent }),
    },
    {
      libelle: 'Date',
      prevu: prevu.date ? formaterJour({ date: prevu.date }) : VIDE,
      reel: reel ? formaterJour({ date: reel.date }) : VIDE,
      ecart: '',
    },
    {
      libelle: 'Coût',
      prevu: prevu.coutEstime === null ? VIDE : formaterEuros({ montant: prevu.coutEstime }),
      reel: reel?.cout == null ? VIDE : formaterEuros({ montant: reel.cout }),
      ecart:
        ecarts.coutEuros === null
          ? ''
          : `${ecarts.coutEuros > 0 ? '+' : ''}${formaterEuros({ montant: ecarts.coutEuros })}`,
    },
  ];

  return (
    <div className="space-y-2">
      <table className="w-full text-xs">
        <thead className="text-left text-[10px] uppercase text-neutral-500">
          <tr>
            <th className="py-1 font-medium" />
            <th className="py-1 font-medium">Prévu</th>
            <th className="py-1 font-medium">Réel</th>
            <th className="py-1 text-right font-medium">Écart</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.libelle} className="border-t border-neutral-100">
              <td className="py-1 text-neutral-500">{ligne.libelle}</td>
              <td className="py-1">{ligne.prevu}</td>
              <td className="py-1">{ligne.reel}</td>
              <td className="py-1 text-right tabular-nums text-neutral-700">{ligne.ecart}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {reel?.photo && (
        <a
          href={`/api${apiRoutes.decisions}/${decision.id}/photo?v=${encodeURIComponent(decision.modifieLe)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block"
        >
          {/* Vignette de la photo d'application, servie par l'API. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api${apiRoutes.decisions}/${decision.id}/photo?v=${encodeURIComponent(decision.modifieLe)}`}
            alt="Photo de l’application"
            className="h-20 w-28 rounded object-cover"
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
}
