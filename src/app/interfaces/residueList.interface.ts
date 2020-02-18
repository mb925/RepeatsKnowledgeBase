export interface ResidueList {
  pdb: string;
  molecules: Array<MoleculeList>;
}

export interface MoleculeList {
  entity_id: number;
  chains: Array<ChainList>;
}

export interface ChainList {
  chain_id: string;
  residues: Array<Residue>;
  struct_asym_id: string;
}

export interface Residue {
  author_residue_number: string;
  residue_number: number;
  author_insertion_code: string;
}
