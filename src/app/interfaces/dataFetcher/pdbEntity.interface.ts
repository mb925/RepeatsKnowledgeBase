export interface PdbEntity {
  pdb: string;
  chain: string;
  regions: Array<RegionEntity>;
}

export interface RegionEntity {
  classification?: Array<string>;
  units: Array<Entity>;
  insertions: Array<Entity>;
}

export interface Entity {
  start: number;
  end: number;
}
