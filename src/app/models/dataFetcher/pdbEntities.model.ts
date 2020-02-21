import {QueryExtractor} from './queryExecutor.abstract';
import {Log} from '../log.model';
import {Entity, PdbEntity, RegionEntity} from '../../interfaces/dataFetcher/pdbEntity.interface';

export class PdbEntitiesModel extends QueryExtractor {

  data: PdbEntity;

  constructor() {
    super('http://repeatsdb.bio.unipd.it/ws/search?entry_type=repeat_region&id=');
    this.data = {pdb: 'Default', chain: 'Default', regions: []};
  }

  /** Get residue list info for all chains in pdb */
  public async getData(pdb: string, chain: string) {

    try {
      pdb = pdb.toLowerCase();
      chain = chain.toString();
    } catch (e) {
      Log.w(1, 'input params must be a string.');
      return undefined;
    }

    const res = await this.query(`${pdb}${chain}&collection=repeat_region&show=ALL`);
    if (!(res instanceof Array)) {
       Log.w(1, 'request to RepeatsDB failed.');
       return undefined;
    }

    if (res.length <= 0) {
      Log.w(1, 'no data returned from RepeatsDB.');
      return undefined;
    }

    const pdbEntity: PdbEntity = {pdb, chain, regions: []};
    let regEntity: RegionEntity;
    let arrayEntities: Array<Entity>;
    for (const region of res) {

      regEntity = {classification: [], units: [], insertions: []};

      if (region.classification !== undefined &&
            region.classification instanceof Array) {
        for (let clas of region.classification) {
          if (typeof clas !== 'string') {
            clas = 'wrong type';
          }
          regEntity.classification.push(clas);
        }
      }

      if (region.units !== undefined) {
        arrayEntities = this.parseArrayEntities(region.units);
        arrayEntities ? regEntity.units = arrayEntities : arrayEntities = undefined;
      }

      if (region.insertions !== undefined) {
        arrayEntities = this.parseArrayEntities(region.insertions);
        arrayEntities ? regEntity.insertions = arrayEntities : arrayEntities = undefined;
      }

      if (regEntity.units.length > 0 || regEntity.insertions.length > 0) {
        pdbEntity.regions.push(regEntity);
      }
    }

    if (pdbEntity.regions.length <= 0) {
      return undefined;
    }

    this.data = pdbEntity;
    return this.data;
  }

  private parseArrayEntities(array) {

    const arrayEntities: Array<Entity> = [];
    let entity: Entity;

    if (!(array instanceof Array)) {
      Log.w(1, 'wrong entities array data format in RepeatsDB.');
      return arrayEntities;
    }

    for (const e of array) {
      entity = this.checkEntity(e);
      entity.start !== -1 ? arrayEntities.push(entity) : entity = undefined;
    }

    return arrayEntities;
  }

  private checkEntity(entity) {

    const result: Entity = {start: -1, end: -1};

    if (!(entity instanceof Array) || entity.length !== 2) {
      Log.w(1, 'wrong entity data type in RepeatsDB.');
      return result;
    }

    if (typeof entity[0] !== 'number' || typeof entity[1] !== 'number') {
      Log.w(1, 'entity bounds are not numeric in RepeatsDB.');
      return result;
    }

    if (entity[0] > entity[1]) {
      Log.w(1, 'entity start greater than entity end in RepeatsDB.');
      return result;
    }

    result.start = entity[0];
    result.end = entity[1];
    return result;
  }

}
