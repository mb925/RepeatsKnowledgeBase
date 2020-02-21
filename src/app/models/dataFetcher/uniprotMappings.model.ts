import {Log} from '../log.model';
import {QueryExtractor} from './queryExecutor.abstract';
import {ChainMapping, PdbMapping, UniprotMapping} from '../../interfaces/dataFetcher/uniprotMapping.interface';

export class UniprotMappingsModel extends QueryExtractor {

  data: UniprotMapping;

  constructor() {
    super('https://www.ebi.ac.uk/pdbe/api/mappings/');
    this.data = {uniprot: 'Default', pdbs: []};
  }

  /**   Get PDB bounds and mappings relative to uniprot */
  public async getData(id: string) {

    try {
      id = id.toUpperCase();
    } catch (e) {
      Log.w(1, 'id is not a string.');
      return undefined;
    }

    const res = await this.query(id);

    if (res[id] === undefined || typeof res[id] !== 'object') {
      Log.w(1, 'unexpected uniprot object returned from EBI website.');
      return undefined;
    }

    if (res[id].PDB === undefined || typeof res[id].PDB !== 'object') {
      Log.w(1, 'unexpected PDB object from EBI website.');
      return undefined;
    }

    // final object
    const processedUniprot: UniprotMapping = {uniprot: id, pdbs: []};
    // support variables
    let processedPdb: PdbMapping;
    let processedChain: ChainMapping;
    // tslint:disable-next-line:forin
    for (let pdb in res[id].PDB) {

      try {
        pdb = pdb.toString();
      } catch (e) {
        Log.w(1, 'pdb is not a string.');
        continue;
      }

      processedPdb = {pdb, chains: []};
      for (const chain of res[id].PDB[pdb]) {
        processedChain = this.processChain(chain);
        if (processedChain.entity_id !== undefined) {
          processedPdb.chains.push(processedChain);
        }
      }

      if (processedPdb.chains.length > 0) {
        processedUniprot.pdbs.push(processedPdb);
      }
    }

    this.data = processedUniprot;
    return this.data;
  }

  private processChain(chain) {

    const chainMapping: ChainMapping = {
      entity_id: undefined,
      chain_id: undefined,
      struct_asym_id: undefined,
      unp_start: undefined,
      unp_end: undefined,
      start_residue_number: undefined,
      end_residue_number: undefined
    };

    if (chain.entity_id === undefined || chain.chain_id === undefined ||
      chain.unp_end === undefined || chain.unp_start === undefined) {
      Log.w(1, 'missing data in chain.');
      return chainMapping;
    }

    if (typeof chain.entity_id !== 'number' || typeof chain.chain_id !== 'string' ||
      typeof chain.unp_end !== 'number' || typeof chain.unp_start !== 'number') {
      Log.w(1, 'wrong data type in chain.');
      return chainMapping;
    }

    chainMapping.entity_id = chain.entity_id;
    chainMapping.chain_id = chain.chain_id;
    chainMapping.struct_asym_id = chain.struct_asym_id;
    chainMapping.unp_start = chain.unp_start;
    chainMapping.unp_end = chain.unp_end;
    chainMapping.start_residue_number = this.processMapping(chain.start);
    chainMapping.end_residue_number = this.processMapping(chain.end);

    return chainMapping;
  }

  private processMapping(mapping) {

    if (mapping === undefined) {
      Log.w(1, 'mapping undefined in chain.');
      return undefined;
    }

    if (typeof mapping !== 'object') {
      Log.w(1, 'wrong mapping data type in chain.');
      return undefined;
    }

    if (mapping.residue_number === undefined) {
      Log.w(1, 'missing residue number data in chain.');
      return undefined;
    }

    if (mapping.residue_number === null) {
      Log.w(1, 'NULL value for residue number.');
      return undefined;
    }

    if (typeof mapping.residue_number !== 'number') {
      Log.w(1, 'wrong residue number data type in chain.');
      return undefined;
    }

    return mapping.residue_number;
  }
}
