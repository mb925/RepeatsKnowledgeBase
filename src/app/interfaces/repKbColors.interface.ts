export interface Clicked {
  chains: Array<any>,
  units: Array<any>,
  insertions: Array<any>,
  user: Array<any>
}

export interface Stv {
  entity_id: string,
  struct_asym_id: string,
  start_residue_number: number,
  end_residue_number: number,
  color: {r: number, g: number, b:number}
}
