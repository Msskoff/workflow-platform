'use client';

import '@xyflow/react/dist/style.css';
import {
  peutConnecter,
  validerWorkflow,
  type Campagne,
  type DescripteurNoeud,
} from '@workflow/shared';
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type NodeTypes,
  type OnConnectEnd,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { creerCampagneDemo, ErreurApi } from '@/lib/api/api-navigateur';
import {
  catalogueDepuis,
  connexionDepuis,
  creerNoeud,
  grapheDemo,
  idConnexion,
  indicateursEnAmont,
  TYPE_NOEUD_EDITEUR,
  versGraphe,
  type DonneesNoeudEditeur,
  type NoeudEditeur,
} from '@/lib/editeur/graphe-editeur';
import { useExecutionWorkflow } from '@/lib/editeur/use-execution-workflow';
import { BarreExecution } from './barre-execution';
import { NoeudWorkflow } from './noeud-workflow';
import { PanneauNoeud } from './panneau-noeud';
import { PaletteNoeuds } from './palette-noeuds';

const typesNoeuds: NodeTypes = { [TYPE_NOEUD_EDITEUR]: NoeudWorkflow };

const IDENTITE_WORKFLOW = {
  workflowId: 'editeur-demo',
  nom: 'Workflow de démonstration',
  version: 1,
};

interface EditeurWorkflowProps {
  descripteurs: DescripteurNoeud[];
  campagnesInitiales: Campagne[];
}

function Editeur({ descripteurs, campagnesInitiales }: EditeurWorkflowProps) {
  const depart = useMemo(() => grapheDemo({ descripteurs }), [descripteurs]);
  const [noeuds, setNoeuds, surChangementNoeuds] = useNodesState<NoeudEditeur>(depart.noeuds);
  const [aretes, setAretes, surChangementAretes] = useEdgesState<Edge>(depart.aretes);
  const [campagnes, setCampagnes] = useState(campagnesInitiales);
  const [campagneId, setCampagneId] = useState(campagnesInitiales[0]?.id ?? '');
  const [messageConnexion, setMessageConnexion] = useState<string | null>(null);
  const [erreursCampagne, setErreursCampagne] = useState<string[]>([]);
  const { execution, erreurs: erreursExecution, enCours, lancer } = useExecutionWorkflow();

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
      setErreursCampagne(erreur instanceof ErreurApi ? erreur.details : [String(erreur)]);
    }
  }, []);

  const executer = useCallback(() => {
    void lancer({ campagneId, snapshot: { ...IDENTITE_WORKFLOW, ...graphe } });
  }, [lancer, campagneId, graphe]);

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

  return (
    <div className="flex h-screen flex-col">
      <BarreExecution
        campagnes={campagnes}
        campagneId={campagneId}
        surChoixCampagne={({ campagneId: choisie }) => setCampagneId(choisie)}
        surCreationCampagneDemo={() => void creerCampagne()}
        surLancement={executer}
        enCours={enCours}
        execution={execution}
        bloquants={erreursGraphe}
        erreurs={[...erreursExecution, ...erreursCampagne]}
        messageConnexion={messageConnexion}
      />
      <div className="flex min-h-0 flex-1">
        <PaletteNoeuds descripteurs={descripteurs} surAjout={ajouterNoeud} />
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
        />
      </div>
    </div>
  );
}

/** Éditeur de workflow : palette, graphe React Flow, exécution et statut par nœud. */
export function EditeurWorkflow(props: EditeurWorkflowProps) {
  return (
    <ReactFlowProvider>
      <Editeur {...props} />
    </ReactFlowProvider>
  );
}
