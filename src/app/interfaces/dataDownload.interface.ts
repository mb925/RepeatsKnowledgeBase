export interface DataDownload {
  uniprot: Uniprot;
  pdbs: Pdbs;
}

/** Uniprot info */
export interface Uniprot {
  seq: string;
  id: string;
}

/** Pdbs info */
export interface Pdbs {
  [pdb: string]: Chain;
}

/** Chain info */
export interface Chain {
  [ch: string]: ChainInfo;
}
/** Chain details */
export interface ChainInfo {
  unp_start: string;
  unp_end: string;
  pdb_indexes: Array<string>;
  repeatsDb_reg?: Array<Region>;
}

/** Region info */
export interface Region {
  classification?: string;
  start?: string;
  end?: string;
  units?: Array<any>;
  insertions?: Array<any>;
}
