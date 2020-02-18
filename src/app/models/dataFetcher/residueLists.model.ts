import {QueryExtractor} from './queryExecutor.abstract';
import {Log} from '../log.model';
import {ChainList, MoleculeList, Residue, ResidueList} from '../../interfaces/residueList.interface';

export class ResidueListsModel extends QueryExtractor {

  data: ResidueList;

  constructor() {
    super('https://www.ebi.ac.uk/pdbe/api/pdb/entry/residue_listing/');
    this.data = {pdb: 'Default', molecules: []};
  }

  /** Get residue list info for all chains in pdb */
  public async getData(pdb: string) {

    try {
      pdb = pdb.toLowerCase();
    } catch (e) {
      Log.w(1, 'id is not a string.');
      return undefined;
    }

    const res = await this.query(pdb);

    if (res[pdb] === undefined || res[pdb].molecules === undefined) {
      Log.w(1, 'wrong pdb list format return from EBI website.');
      return undefined;
    }

    const resList: ResidueList = {pdb, molecules: []};
    let molList: MoleculeList;
    let chaList: ChainList;
    let resRef: Residue;
    for (const molecule of res[pdb].molecules) {

      if (molecule.entity_id === undefined ||
            typeof molecule.entity_id !== 'number') {
        Log.w(1, 'missing entity_id in molecule.');
        continue;
      }

      molList = {entity_id: molecule.entity_id, chains: []};

      for (const chain of molecule.chains) {

        if (chain.struct_asym_id === undefined ||
          typeof chain.struct_asym_id !== 'string') {
          Log.w(1, 'missing chain_id in chain.');
          continue;
        }

        chaList = {chain_id: chain.chain_id, struct_asym_id: chain.struct_asym_id, residues: []};
        for (const residue of chain.residues) {

          if (residue.residue_number === undefined ||
                residue.author_residue_number === undefined ||
                  typeof residue.residue_number !== 'number' ||
                    typeof residue.author_residue_number !== 'number') {
            Log.w(1, 'missing residue index in residue list.');
            continue;
          }

          resRef = {
            residue_number: residue.residue_number,
            author_residue_number: residue.author_residue_number,
            author_insertion_code: residue.author_insertion_code ? residue.author_insertion_code : ''
          };
          chaList.residues.push(resRef);
        }

        chaList.residues.length > 0 ? molList.chains.push(chaList) : chaList = undefined;
        }

      molList.chains.length > 0 ? resList.molecules.push(molList) : molList = undefined;
      }

    if (resList.molecules.length <= 0) {
      return undefined;
    }
    this.data = resList;
    return this.data;
  }

}
