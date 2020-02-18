import {RegionEntity} from './pdbEntity.interface';

export interface DataFetcher {
  uniprots: {[id: string]: UniprotInfo};
  pdbs: {[pdb: string]: PdbInfo};
}

/** Uniprots info */
export interface UniprotInfo {
  sequence: string;
  pdbs: PdbsDict;
}

export interface PdbsDict {
  [pdb: string]: Array<string>;
}

/** Pdbs info */
export interface PdbInfo {
  uniprots: Set<string>;
  tooltip: string;
  chains: {[chain: string]: ChainInfo};
}

/** Chain info */
export interface ChainInfo {
  entity_id: number;
  chain_id: string;
  struct_asym_id: string;
  tooltip: string;
  regions: Array<RegionEntity>;
  unp_start: number;
  unp_end: number;
  start_res_num: number;
  end_res_num: number;
  unp_to_aut: {[unp: number]: number};
  aut_to_unp: {[aut: number]: number};
  shift: number;
}
