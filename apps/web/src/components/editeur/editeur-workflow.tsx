'use client';

import '@xyflow/react/dist/style.css';
import {
  peutConnecter,
  validerWorkflow,
  type Campagne,
  type DescripteurNoeud,
  type ResumeModele,
} from '@workflow/shared';
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeTypes,
  type OnConnectEnd,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { creerCampagneDemo, creerModele, ErreurApi, lireModele } from '@/lib/api/api-navigateur';
import {
  catalogueDepuis,
  connexionDepuis,
  creerNoeud,
  grapheDemo,
  grapheDepuisModele,
  grapheSansDonnees,
  idConnexion,
  indicateursEnAmont,
  TYPE_NOEUD_EDITEUR,
  versGraphe,
  type DonneesNoeudEditeur,
  type NoeudEditeur,
} from '@/lib/editeur/graphe-editeur';
import { useExecutionWorkflow } from '@/lib/editeur/use-execution-workflow';
import { BarreExecution } from './barre-execution';
import { FormulaireEnregistrerModele } from './formulaire-enregistrer-modele';
import { ListeModeles } from './liste-modeles';
import { NoeudWorkflow } from './noeud-workflow';
import { PaletteNoeuds } from './palette-noeuds';
import { PanneauNoeud } from './panneau-noeud';

const typesNoeuds: NodeTypes = { [TYPE_NOEUD_EDITEUR]: NoeudWorkflow };

/** Identité du workflow exécuté : les exécutions sont versionnées par workflow. */
interface IdentiteWorkflow {
  workflowId: string;
  nom: string;
  version: number;
}

const IDENTITE_LIBRE: IdentiteWorkflow = {
  workflowId: 'editeur-demo',
  nom: 'Workflow de démonstration',
  version: 1,
};

function messageErreur({ erreur }: { erreur: unknown }): string[] {
  return erreur instanceof ErreurApi ? erreur.details : [String(erreur)];
}

interface EditeurWorkflowProps {
  descripteurs: DescripteurNoeud[];
  campagnesInitiales: Campagne[];
  /** « Client · Parcelle · Campagne », par identifiant de campagne. */
  libellesCampagnes: Readonly<Record<string, string>>;
  modelesInitiaux: ResumeModele[];
}

function Editeur({
  descripteurs,
  campagnesInitiales,
  libellesCampagnes,
  modelesInitiaux,
}: EditeurWorkflowProps) {
  const { fitView } = useReactFlow();
  const depart = useMemo(() => grapheDemo({ descripteurs }), [descripteurs]);
  const [noeuds, setNoeuds, surChangementNoeuds] = useNodesState<NoeudEditeur>(depart.noeuds);
  const [aretes, setAretes, surChangementAretes] = useEdgesState<Edge>(depart.aretes);
  const [identite, setIdentite] = useState<IdentiteWorkflow>(IDENTITE_LIBRE);
  const [campagnes, setCampagnes] = useState(campagnesInitiales);
  const [campagneId, setCampagneId] = useState(campagnesInitiales[0]?.id ?? '');
  const [messageConnexion, setMessageConnexion] = useState<string | null>(null);
  const [erreursCampagne, setErreursCampagne] = useState<string[]>([]);
  const [modeles, setModeles] = useState(modelesInitiaux);
  const [modeleActifId, setModeleActifId] = useState<string | null>(null);
  const [chargementModele, setChargementModele] = useState(false);
  const [messageModele, setMessageModele] = useState<string | null>(null);
  const [erreursModele, setErreursModele] = useState<string[]>([]);
  const [formulaireModeleOuvert, setFormulaireModeleOuvert] = useState(false);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const {
    execution,
    erreurs: erreursExecution,
    enCours,
    lancer,
    reinitialiser,
  } = useExecutionWorkflow();

  const catalogue = useMemo(() => catalogueDepuis({ descripteurs }), [descripteurs]);
  const graphe = useMemo(() => versGraphe({ noeuds, aretes }), [noeuds, aretes]);

  // Même validation que le serveur (hors paramètres) : bloque l'exécution tant que le graphe est invalide.
  const erreursGraphe = useMemo(
    () =>
      graphe.noeuds.length === 0
        ? ['Ajoutez au moins un nœud']
        : validerWorkflow({ graphe, catalogue }).map((erreur) => erreur.message),
    [graphe, catalogue],
  );

  // Statut par nœud renvoyé par l'API, injecté dans les données affichées par React Flow.
  const noeudsAffiches = useMemo(() => {
    const etats = new Map(execution?.noeuds.map((etat) => [etat.noeudId, etat]));
    return noeuds.map((noeud) => {
      const etat = etats.get(noeud.id);
      return etat ? { ...noeud, data: { ...noeud.data, etat } } : noeud;
    });
  }, [noeuds, execution]);

  const estConnexionValide = useCallback(
    (connexion: Connection | Edge) => {
      const proposee = connexionDepuis({ connexion });
      return proposee !== null && peutConnecter({ graphe, catalogue, connexion: proposee }).ok;
    },
    [graphe, catalogue],
  );

  const surConnexion = useCallback(
    (connexion: Connection) => {
      const proposee = connexionDepuis({ connexion });
      if (!proposee) {
        return;
      }
      setMessageConnexion(null);
      setAretes((existantes) =>
        addEdge({ ...connexion, id: idConnexion({ connexion: proposee }) }, existantes),
      );
    },
    [setAretes],
  );

  // Explique pourquoi React Flow a refusé la connexion lâchée sur une poignée.
  const surFinConnexion: OnConnectEnd = useCallback(
    (_evenement, etatConnexion) => {
      const { fromHandle, toHandle, isValid } = etatConnexion;
      if (isValid !== false || !fromHandle || !toHandle || fromHandle.type === toHandle.type) {
        return;
      }
      const [source, cible] =
        fromHandle.type === 'source' ? [fromHandle, toHandle] : [toHandle, fromHandle];
      const resultat = peutConnecter({
        graphe,
        catalogue,
        connexion: {
          source: source.nodeId,
          sourcePort: source.id ?? '',
          cible: cible.nodeId,
          ciblePort: cible.id ?? '',
        },
      });
      setMessageConnexion(resultat.ok ? null : resultat.erreur.message);
    },
    [graphe, catalogue],
  );

  const ajouterNoeud = useCallback(
    ({ descripteur }: { descripteur: DescripteurNoeud }) => {
      setNoeuds((existants) => [
        ...existants,
        creerNoeud({
          descripteur,
          position: { x: 80 + existants.length * 40, y: 260 + existants.length * 30 },
          idsExistants: new Set(existants.map((noeud) => noeud.id)),
        }),
      ]);
    },
    [setNoeuds],
  );

  const creerCampagne = useCallback(async () => {
    try {
      const campagne = await creerCampagneDemo();
      setCampagnes((existantes) => [...existantes, campagne]);
      setCampagneId(campagne.id);
      setErreursCampagne([]);
    } catch (erreur) {
      setErreursCampagne(messageErreur({ erreur }));
    }
  }, []);

  const executer = useCallback(() => {
    void lancer({ campagneId, snapshot: { ...identite, ...graphe } });
  }, [lancer, campagneId, identite, graphe]);

  /** Remplace le graphe par celui du modèle ; les exécutions seront versionnées sous ce modèle. */
  const chargerModele = useCallback(
    async ({ modele }: { modele: ResumeModele }) => {
      setChargementModele(true);
      setErreursModele([]);
      try {
        const complet = await lireModele({ id: modele.id });
        const charge = grapheDepuisModele({ graphe: complet.graphe, descripteurs });
        setNoeuds(charge.noeuds);
        setAretes(charge.aretes);
        setIdentite({
          workflowId: `modele-${complet.code ?? complet.id}`,
          nom: complet.nom,
          version: 1,
        });
        setModeleActifId(complet.id);
        setMessageConnexion(null);
        reinitialiser();
        setMessageModele(
          charge.typesInconnus.length > 0
            ? `Modèle « ${complet.nom} » chargé ; nœuds ignorés (types inconnus) : ${charge.typesInconnus.join(', ')}`
            : `Modèle « ${complet.nom} » chargé.`,
        );
        // Recadrage une fois les nouveaux nœuds mesurés par React Flow.
        setTimeout(() => void fitView({ maxZoom: 1, padding: 0.1 }), 100);
      } catch (erreur) {
        setErreursModele(messageErreur({ erreur }));
      } finally {
        setChargementModele(false);
      }
    },
    [descripteurs, setNoeuds, setAretes, reinitialiser, fitView],
  );

  const enregistrerModele = useCallback(
    async ({ nom, description }: { nom: string; description: string }) => {
      setEnregistrementEnCours(true);
      setErreursModele([]);
      try {
        const modele = await creerModele({
          donnees: { nom, description, graphe: grapheSansDonnees({ graphe, descripteurs }) },
        });
        setModeles((existants) => [
          ...existants,
          {
            id: modele.id,
            code: modele.code,
            nom: modele.nom,
            description: modele.description,
            predefini: modele.predefini,
            nombreNoeuds: modele.graphe.noeuds.length,
            creeLe: modele.creeLe,
            modifieLe: modele.modifieLe,
          },
        ]);
        setIdentite({ workflowId: `modele-${modele.id}`, nom: modele.nom, version: 1 });
        setModeleActifId(modele.id);
        setFormulaireModeleOuvert(false);
        setMessageModele(`Modèle « ${modele.nom} » enregistré.`);
      } catch (erreur) {
        setErreursModele(messageErreur({ erreur }));
      } finally {
        setEnregistrementEnCours(false);
      }
    },
    [graphe, descripteurs],
  );

  // Le panneau latéral édite le nœud sélectionné (un seul à la fois).
  const noeudSelectionne = useMemo(() => {
    const selectionnes = noeudsAffiches.filter((noeud) => noeud.selected);
    return selectionnes.length === 1 ? (selectionnes[0] ?? null) : null;
  }, [noeudsAffiches]);

  const indicateursDisponibles = useMemo(
    () =>
      noeudSelectionne ? indicateursEnAmont({ noeudId: noeudSelectionne.id, noeuds, aretes }) : [],
    [noeudSelectionne, noeuds, aretes],
  );

  const modifierParametres = useCallback(
    ({ parametres }: { parametres: DonneesNoeudEditeur['parametres'] }) => {
      if (!noeudSelectionne) {
        return;
      }
      setNoeuds((existants) =>
        existants.map((noeud) =>
          noeud.id === noeudSelectionne.id
            ? { ...noeud, data: { ...noeud.data, parametres } }
            : noeud,
        ),
      );
    },
    [noeudSelectionne, setNoeuds],
  );

  const complement = formulaireModeleOuvert ? (
    <FormulaireEnregistrerModele
      nomPropose={identite === IDENTITE_LIBRE ? '' : `${identite.nom} (copie)`}
      enCours={enregistrementEnCours}
      erreurs={erreursModele}
      surEnregistrement={(valeurs) => void enregistrerModele(valeurs)}
      surAnnulation={() => {
        setFormulaireModeleOuvert(false);
        setErreursModele([]);
      }}
    />
  ) : messageModele || erreursModele.length > 0 ? (
    <p
      className={`rounded px-3 py-1.5 text-sm ${erreursModele.length > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}
      role="status"
    >
      {erreursModele.length > 0 ? erreursModele.join(' ; ') : messageModele}
    </p>
  ) : null;

  return (
    <div className="flex h-screen flex-col">
      <BarreExecution
        campagnes={campagnes}
        libellesCampagnes={libellesCampagnes}
        campagneId={campagneId}
        surChoixCampagne={({ campagneId: choisie }) => setCampagneId(choisie)}
        surCreationCampagneDemo={() => void creerCampagne()}
        surLancement={executer}
        enCours={enCours}
        execution={execution}
        bloquants={erreursGraphe}
        erreurs={[...erreursExecution, ...erreursCampagne]}
        messageConnexion={messageConnexion}
        nomWorkflow={identite.nom}
        surEnregistrementModele={() => {
          setMessageModele(null);
          setFormulaireModeleOuvert(true);
        }}
        complement={complement}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 space-y-5 overflow-y-auto border-r border-neutral-200 bg-white p-3">
          <ListeModeles
            modeles={modeles}
            modeleActifId={modeleActifId}
            chargementEnCours={chargementModele}
            surChargement={({ modele }) => void chargerModele({ modele })}
          />
          <PaletteNoeuds descripteurs={descripteurs} surAjout={ajouterNoeud} />
        </aside>
        <div className="flex-1">
          <ReactFlow
            nodes={noeudsAffiches}
            edges={aretes}
            nodeTypes={typesNoeuds}
            onNodesChange={surChangementNoeuds}
            onEdgesChange={surChangementAretes}
            onConnect={surConnexion}
            onConnectEnd={surFinConnexion}
            isValidConnection={estConnexionValide}
            fitView
            fitViewOptions={{ maxZoom: 1 }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <PanneauNoeud
          noeud={noeudSelectionne}
          indicateursDisponibles={indicateursDisponibles}
          surChangementParametres={modifierParametres}
          executionId={execution?.id ?? null}
        />
      </div>
    </div>
  );
}

/** Éditeur de workflow : modèles, palette, graphe React Flow, exécution et statut par nœud. */
export function EditeurWorkflow(props: EditeurWorkflowProps) {
  return (
    <ReactFlowProvider>
      <Editeur {...props} />
    </ReactFlowProvider>
  );
}
