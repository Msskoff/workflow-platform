import {
  bandesZonage,
  calculerCadrage,
  couleurZoneRvb,
  empriseCarte,
  libelleZone,
  libellesPrioriteClient,
  versEcran,
  type CarteParcelle,
  type PrioriteDecision,
  type RapportParcelle,
  type Rvb,
} from '@workflow/shared';
import { readFileSync } from 'node:fs';
import PDFDocument from 'pdfkit';

/** Décision présentée dans le rapport (déjà validée ou envoyée). */
export interface DecisionRapport {
  recommandation: string | null;
  explication: string;
  priorite: PrioriteDecision | null;
}

export interface DonneesRapportPdf {
  rapport: RapportParcelle;
  client: { nom: string };
  parcelle: { nom: string };
  campagne: { nom: string; culture: string | null };
  /** Décisions retenues, dans l'ordre d'affichage. */
  decisions: DecisionRapport[];
  /** `apercu` : bandeau « document interne » (décisions validées, pas encore envoyées). */
  destination: 'client' | 'apercu';
}

type Document = PDFKit.PDFDocument;

const MARGE = 50;
const LARGEUR_UTILE = 595.28 - 2 * MARGE;
const COULEUR_TEXTE = '#1f2937';
const COULEUR_DOUCE = '#6b7280';
const COULEUR_ACCENT = '#047857';

const COULEURS_PRIORITE: Readonly<Record<PrioriteDecision, string>> = {
  haute: '#b91c1c',
  normale: '#0369a1',
  basse: '#6b7280',
};

/** Poppins, comme l'application, chargée depuis @fontsource (WOFF, lu par pdfkit). */
function police({ poids }: { poids: 400 | 600 }): Buffer {
  return readFileSync(
    require.resolve(`@fontsource/poppins/files/poppins-latin-${poids}-normal.woff`),
  );
}

function nombre({ valeur, decimales = 2 }: { valeur: number; decimales?: number }): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: decimales });
}

function euros({ montant }: { montant: number }): string {
  return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function dateLongue({ iso }: { iso: string }): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Passe à la page suivante s'il ne reste pas `hauteur` points. */
function assurerEspace({ doc, hauteur }: { doc: Document; hauteur: number }): void {
  if (doc.y + hauteur > doc.page.height - MARGE - 30) {
    doc.addPage();
  }
}

function titreSection({ doc, texte }: { doc: Document; texte: string }): void {
  assurerEspace({ doc, hauteur: 60 });
  doc.moveDown(0.8);
  doc.font('Poppins-600').fontSize(14).fillColor(COULEUR_ACCENT).text(texte, MARGE, doc.y);
  doc.moveDown(0.3);
  doc.font('Poppins').fontSize(10).fillColor(COULEUR_TEXTE);
}

function enTete({ doc, donnees }: { doc: Document; donnees: DonneesRapportPdf }): void {
  const { rapport, client, parcelle, campagne } = donnees;
  doc.rect(0, 0, doc.page.width, 110).fill(COULEUR_ACCENT);
  doc
    .font('Poppins-600')
    .fontSize(20)
    .fillColor('white')
    .text(rapport.titre, MARGE, 32, { width: LARGEUR_UTILE });
  doc
    .font('Poppins')
    .fontSize(10)
    .text(
      `${parcelle.nom} · ${campagne.nom}${campagne.culture ? ` (${campagne.culture})` : ''} · ${client.nom}`,
      MARGE,
      64,
      { width: LARGEUR_UTILE },
    )
    .text(`Établi le ${dateLongue({ iso: rapport.genereLe })}`, MARGE, 80);
  doc.y = 130;
  if (donnees.destination === 'apercu') {
    doc.rect(MARGE, doc.y, LARGEUR_UTILE, 24).fill('#fef3c7');
    doc
      .font('Poppins-600')
      .fontSize(9)
      .fillColor('#92400e')
      .text(
        'Aperçu interne : décisions validées, pas encore envoyées au client.',
        MARGE + 10,
        doc.y + 7,
      );
    doc.y += 32;
  }
  doc
    .font('Poppins')
    .fontSize(10.5)
    .fillColor(COULEUR_TEXTE)
    .text(rapport.introduction, MARGE, doc.y, {
      width: LARGEUR_UTILE,
      lineGap: 2,
    });
}

function tracerContour({
  doc,
  carte,
  x,
  y,
  cadrage,
}: {
  doc: Document;
  carte: CarteParcelle;
  x: number;
  y: number;
  cadrage: ReturnType<typeof calculerCadrage>;
}): boolean {
  if (!carte.contour) {
    return false;
  }
  const polygones =
    carte.contour.type === 'Polygon' ? [carte.contour.coordinates] : carte.contour.coordinates;
  for (const anneau of polygones.flat()) {
    anneau.forEach(([px = 0, py = 0], index) => {
      const point = versEcran({ cadrage, x: px, y: py });
      if (index === 0) {
        doc.moveTo(x + point.x, y + point.y);
      } else {
        doc.lineTo(x + point.x, y + point.y);
      }
    });
    doc.closePath();
  }
  return true;
}

/** Carte : zones colorées découpées sur le contour, contour en trait, légende. */
function carte({ doc, rapport }: { doc: Document; rapport: RapportParcelle }): void {
  const { carte: donneesCarte } = rapport;
  const emprise = empriseCarte({ carte: donneesCarte });
  if (!emprise) {
    doc.fillColor(COULEUR_DOUCE).text('Carte indisponible pour cette analyse.');
    return;
  }
  const hauteur = 240;
  assurerEspace({ doc, hauteur: hauteur + 80 });
  const [x, y] = [MARGE, doc.y + 4];
  const cadrage = calculerCadrage({ emprise, largeur: LARGEUR_UTILE, hauteur, marge: 10 });
  doc.rect(x, y, LARGEUR_UTILE, hauteur).fill('#f9fafb');

  const zonage = donneesCarte.zonage;
  const total = zonage?.zones.length ?? 0;
  if (zonage) {
    doc.save();
    if (tracerContour({ doc, carte: donneesCarte, x, y, cadrage })) {
      doc.clip('even-odd');
    }
    for (const bande of bandesZonage({ zonage })) {
      const coin = versEcran({
        cadrage,
        x: zonage.origineX + bande.colonneDebut * zonage.resolutionX,
        y: zonage.origineY + bande.ligne * zonage.resolutionY,
      });
      const couleur: Rvb = couleurZoneRvb({ numero: bande.zone, total });
      doc
        .rect(
          x + coin.x,
          y + coin.y,
          bande.longueur * Math.abs(zonage.resolutionX) * cadrage.echelle + 0.5,
          Math.abs(zonage.resolutionY) * cadrage.echelle + 0.5,
        )
        .fill([...couleur]);
    }
    doc.restore();
  }
  if (tracerContour({ doc, carte: donneesCarte, x, y, cadrage })) {
    doc.lineWidth(1.5).strokeColor('#111827').stroke();
  }
  doc.y = y + hauteur + 10;

  if (zonage) {
    for (const zone of zonage.zones) {
      assurerEspace({ doc, hauteur: 18 });
      const ligne = doc.y;
      doc.rect(MARGE, ligne + 2, 12, 12).fill([...couleurZoneRvb({ numero: zone.numero, total })]);
      doc
        .fillColor(COULEUR_TEXTE)
        .text(
          `Zone ${zone.numero} · ${libelleZone({ numero: zone.numero, total })} : ${nombre({ valeur: zone.surfaceHa })} ha (${nombre({ valeur: zone.partSurface, decimales: 0 })} % de la parcelle)`,
          MARGE + 20,
          ligne,
        );
    }
  }
}

function chiffresCles({ doc, rapport }: { doc: Document; rapport: RapportParcelle }): void {
  const { indicateurs } = rapport;
  const lignes = [
    rapport.surfaceHa !== null && `Surface : ${nombre({ valeur: rapport.surfaceHa })} ha`,
    indicateurs.ndviMoyen !== undefined &&
      `Vigueur moyenne de la végétation (indice NDVI, de 0 à 1) : ${nombre({ valeur: indicateurs.ndviMoyen })}`,
    indicateurs.nombreZones !== undefined &&
      `La parcelle se divise en ${indicateurs.nombreZones} zones de vigueur différente`,
  ].filter((ligne): ligne is string => typeof ligne === 'string');
  for (const ligne of lignes) {
    doc.text(`•  ${ligne}`, MARGE, doc.y, { width: LARGEUR_UTILE });
  }
  doc.moveDown(0.5);
}

function recommandations({
  doc,
  decisions,
}: {
  doc: Document;
  decisions: DecisionRapport[];
}): void {
  if (decisions.length === 0) {
    doc
      .fillColor(COULEUR_DOUCE)
      .text('Aucune recommandation validée pour le moment.', MARGE, doc.y);
    return;
  }
  decisions.forEach((decision, index) => {
    assurerEspace({ doc, hauteur: 80 });
    const priorite = decision.priorite
      ? {
          libelle: libellesPrioriteClient[decision.priorite],
          couleur: COULEURS_PRIORITE[decision.priorite],
        }
      : null;
    doc
      .font('Poppins-600')
      .fontSize(11)
      .fillColor(COULEUR_TEXTE)
      .text(`${index + 1}. ${decision.recommandation ?? 'Recommandation'}`, MARGE, doc.y, {
        width: LARGEUR_UTILE,
      });
    if (priorite) {
      doc
        .font('Poppins-600')
        .fontSize(9)
        .fillColor(priorite.couleur)
        .text(priorite.libelle, MARGE + 14, doc.y);
    }
    doc
      .font('Poppins-600')
      .fontSize(10)
      .fillColor(COULEUR_TEXTE)
      .text('Pourquoi ? ', MARGE + 14, doc.y + 2, { continued: true, width: LARGEUR_UTILE - 14 })
      .font('Poppins')
      .text(decision.explication, { lineGap: 1.5 });
    doc.moveDown(0.7);
  });
}

function actions({ doc, decisions }: { doc: Document; decisions: DecisionRapport[] }): void {
  const aFaire = decisions.filter((decision) => decision.recommandation);
  if (aFaire.length === 0) {
    doc.fillColor(COULEUR_DOUCE).text('Pas d’action particulière à prévoir.', MARGE, doc.y);
    return;
  }
  for (const decision of aFaire) {
    assurerEspace({ doc, hauteur: 24 });
    const ligne = doc.y;
    doc
      .rect(MARGE, ligne + 2, 10, 10)
      .lineWidth(1)
      .strokeColor(COULEUR_TEXTE)
      .stroke();
    doc.fillColor(COULEUR_TEXTE).text(decision.recommandation ?? '', MARGE + 18, ligne, {
      width: LARGEUR_UTILE - 18,
    });
    doc.moveDown(0.3);
  }
}

function devis({ doc, rapport }: { doc: Document; rapport: RapportParcelle }): void {
  const donnees = rapport.devis;
  if (!donnees) {
    doc.fillColor(COULEUR_DOUCE).text('Pas de devis pour cette analyse.', MARGE, doc.y);
    return;
  }
  const colonneMontant = MARGE + LARGEUR_UTILE - 110;
  const ligneDevis = ({
    libelle,
    montant,
    gras = false,
  }: {
    libelle: string;
    montant: string;
    gras?: boolean;
  }) => {
    assurerEspace({ doc, hauteur: 20 });
    const y = doc.y;
    doc.font(gras ? 'Poppins-600' : 'Poppins').fillColor(COULEUR_TEXTE);
    doc.text(libelle, MARGE, y, { width: colonneMontant - MARGE - 10 });
    const apres = doc.y;
    doc.text(montant, colonneMontant, y, { width: 110, align: 'right' });
    doc.y = Math.max(apres, doc.y) + 2;
  };
  for (const ligne of donnees.lignes) {
    ligneDevis({
      libelle: `${ligne.service} (${nombre({ valeur: ligne.quantiteHa })} ha × ${euros({ montant: ligne.tarifHtParHa })})`,
      montant: euros({ montant: ligne.montantHt }),
    });
  }
  if (donnees.fraisFixesHt > 0) {
    ligneDevis({ libelle: 'Frais fixes', montant: euros({ montant: donnees.fraisFixesHt }) });
  }
  doc
    .moveTo(MARGE, doc.y)
    .lineTo(MARGE + LARGEUR_UTILE, doc.y)
    .lineWidth(0.5)
    .strokeColor('#d1d5db')
    .stroke();
  doc.y += 4;
  ligneDevis({ libelle: 'Total hors taxes', montant: euros({ montant: donnees.totalHt }) });
  ligneDevis({
    libelle: `TVA ${nombre({ valeur: donnees.tauxTvaPourcent })} %`,
    montant: euros({ montant: donnees.montantTva }),
  });
  ligneDevis({ libelle: 'Total TTC', montant: euros({ montant: donnees.totalTtc }), gras: true });
  doc
    .font('Poppins')
    .fontSize(8.5)
    .fillColor(COULEUR_DOUCE)
    .text('Devis indicatif, sans valeur de facture.', MARGE, doc.y + 4);
}

function piedsDePage({ doc }: { doc: Document }): void {
  const { start, count } = doc.bufferedPageRange();
  for (let index = start; index < start + count; index++) {
    doc.switchToPage(index);
    // Le pied de page est sous la marge basse : sans cela, pdfkit ajouterait une page blanche.
    const margeBasse = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('Poppins')
      .fontSize(8)
      .fillColor(COULEUR_DOUCE)
      .text(
        `Rapport établi à partir de mesures satellite et de règles agronomiques explicites · Page ${index + 1} / ${count}`,
        MARGE,
        doc.page.height - MARGE,
        { width: LARGEUR_UTILE, align: 'center', lineBreak: false },
      );
    doc.page.margins.bottom = margeBasse;
  }
}

interface GenererRapportPdfParams {
  donnees: DonneesRapportPdf;
  /** Faux uniquement pour les tests (texte lisible dans le fichier). */
  compresser?: boolean;
}

/** Rapport client en PDF : parcelle et carte, recommandations et pourquoi, actions, devis. */
export function genererRapportPdf({
  donnees,
  compresser = true,
}: GenererRapportPdfParams): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE },
    bufferPages: true,
    compress: compresser,
    info: {
      Title: donnees.rapport.titre,
      Author: 'Data Green Tools',
      Subject: donnees.parcelle.nom,
    },
  });
  doc.registerFont('Poppins', police({ poids: 400 }));
  doc.registerFont('Poppins-600', police({ poids: 600 }));

  const morceaux: Buffer[] = [];
  const fin = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (morceau: Buffer) => morceaux.push(morceau));
    doc.on('end', () => resolve(Buffer.concat(morceaux)));
    doc.on('error', reject);
  });

  enTete({ doc, donnees });
  titreSection({ doc, texte: '1. Votre parcelle' });
  chiffresCles({ doc, rapport: donnees.rapport });
  carte({ doc, rapport: donnees.rapport });
  titreSection({ doc, texte: '2. Nos recommandations' });
  recommandations({ doc, decisions: donnees.decisions });
  titreSection({ doc, texte: '3. Vos prochaines actions' });
  actions({ doc, decisions: donnees.decisions });
  titreSection({ doc, texte: '4. Devis' });
  devis({ doc, rapport: donnees.rapport });
  piedsDePage({ doc });
  doc.end();
  return fin;
}
