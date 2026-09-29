/** Contrat commun des services de lecture d'une entité. */
export interface ServiceLecture<Entite, Filtre> {
  lister(params: { filtre: Filtre }): Promise<Entite[]>;
  trouver(params: { id: string }): Promise<Entite>;
}

/** Contrat commun des services CRUD d'une entité. */
export interface ServiceCrud<Entite, Creation, Modification, Filtre> extends ServiceLecture<
  Entite,
  Filtre
> {
  creer(params: { donnees: Creation }): Promise<Entite>;
  modifier(params: { id: string; donnees: Modification }): Promise<Entite>;
  supprimer(params: { id: string }): Promise<void>;
}
