/** Montant en euros : « 1 234,50 € ». */
export function formaterEuros({ montant }: { montant: number }): string {
  return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/** Pourcentage signé : « +12,5 % », « −3 % », « 0 % ». */
export function formaterEcartPourcent({ ecart }: { ecart: number }): string {
  const texte = Math.abs(ecart).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  if (ecart === 0) {
    return '0 %';
  }
  return `${ecart > 0 ? '+' : '−'}${texte} %`;
}

/** Dose avec son unité : « 80 kg/ha ». */
export function formaterDose({ dose, unite }: { dose: number; unite: string | null }): string {
  const texte = dose.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return unite ? `${texte} ${unite}` : texte;
}

/** Date calendaire AAAA-MM-JJ → « 2 oct. 2026 ». */
export function formaterJour({ date }: { date: string }): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Aujourd'hui au format AAAA-MM-JJ (heure locale). */
export function aujourdHui(): string {
  const date = new Date();
  const deuxChiffres = (valeur: number) => String(valeur).padStart(2, '0');
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}
