export interface UniprotMapping {
  uniprot: string;
  pdbs: Array<PdbMapping>;
}

export interface PdbMapping {
  pdb: string;
  chains: Array<ChainMapping>;
}

export interface ChainMapping {
  entity_id: number;
  start_residue_number: number;
  end_residue_number: number;
  chain_id: string;
  struct_asym_id: string;
  unp_start: number;
  unp_end: number;
}
