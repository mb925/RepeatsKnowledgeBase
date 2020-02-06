import {UniprotSequencesModel} from './uniprotSequences.model';
import {UniprotMappingsModel} from './uniprotMappings.model';
import {ChainInfo, DataFetcher, PdbInfo, UniprotInfo} from '../../interfaces/dataFetcher.interface';
import {ResidueListsModel} from './residueLists.model';
import {PdbEntitiesModel} from './pdbEntities.model';
import {PdbEntity} from '../../interfaces/pdbEntity.interface';
import {ResidueList} from '../../interfaces/residueList.interface';
import {Log} from '../log.model';

export class DataFetcherModel {

  data: DataFetcher;
  uniprotSequence: UniprotSequencesModel;
  uniprotMappings: UniprotMappingsModel;
  residueLists: ResidueListsModel;
  pdbEntities: PdbEntitiesModel;

  constructor() {
    this.data = {uniprots: {}, pdbs: {}};
    this.uniprotSequence = new UniprotSequencesModel();
    this.uniprotMappings = new UniprotMappingsModel();
    this.residueLists = new ResidueListsModel();
    this.pdbEntities = new PdbEntitiesModel();
  }

  public async getData(id) {

    if (id.toString() in this.data.uniprots) {
      Log.w(2, 'data already stored in cache.');
      return undefined;
    }

    const unpSequence = await this.uniprotSequence.getData(id);
    if (!unpSequence) {
      return undefined;
    }

    const unpMapping = await this.uniprotMappings.getData(id);
    if (!unpMapping) {
      return undefined;
    }

    const uniprotInfo: UniprotInfo = {sequence: unpSequence.sequence, pdbs: {}};
    let pdbInfo: PdbInfo;
    let chainId: string;
    let chainInfo: ChainInfo;
    let resList: ResidueList;
    let entList: PdbEntity;
    let resListObj;
    let tmp: any;

    for (const pdb of unpMapping.pdbs) {

      uniprotInfo.pdbs[pdb.pdb] = [];
      pdbInfo = {
        uniprots: new Set<string>([unpSequence.id]),
        tooltip: '',
        chains: {}
      };

      resList = await this.residueLists.getData(pdb.pdb);
      if (!resList) {
        continue;
      }

      resListObj = {};
      for (const molecule of resList.molecules) {
        if (!(molecule.entity_id in resListObj)) {
          resListObj[molecule.entity_id] = {};
        }
        tmp = resListObj[molecule.entity_id];
        for (const chain of molecule.chains) {
          if (chain.chain_id in tmp) {
            tmp[chain.chain_id] = tmp[chain.chain_id].concat(chain.residues);
          } else {
            tmp[chain.chain_id] = chain.residues;
          }
        }
      }

      for (const chain of pdb.chains) {
        chainId = chain.chain_id;

        // check if chain already inserted
        // prevents to execute also for other fragments
        if (!(pdbInfo.chains.hasOwnProperty(chainId))) {

          // push inside uniprot list
          uniprotInfo.pdbs[pdb.pdb].push(chainId);
          // push inside pdbs dict
          pdbInfo.chains[chainId] = {
            entity_id: undefined,
            chain_id: chainId,
            tooltip: '',
            regions: [],
            unp_end: -1,
            unp_start: Infinity,
            start_res_num: Infinity,
            end_res_num: -1,
            shift: undefined,
            unp_to_aut: {},
            aut_to_unp: {}
          };

        }

        chainInfo = pdbInfo.chains[chainId];

        // merging fragments
        if (chain.unp_start !== undefined && (chain.unp_start < chainInfo.unp_start)) {
          chainInfo.unp_start = chain.unp_start;
          chainInfo.start_res_num = chain.start_residue_number;
        }

        if (chain.unp_end !== undefined && (chain.unp_end > chainInfo.unp_end)) {
          chainInfo.unp_end = chain.unp_end;
          chainInfo.end_res_num = chain.end_residue_number;
        }

        // find chain regions
        pdbInfo.chains[chainId].entity_id = chain.entity_id;
        entList = await this.pdbEntities.getData(pdb.pdb, chainId);
        if (!entList) {
          continue;
        }
        pdbInfo.chains[chainId].regions = entList.regions;
      }

      for (const ch of uniprotInfo.pdbs[pdb.pdb]) {
        chainInfo = pdbInfo.chains[ch];

        // calculate shift
        if (chainInfo.unp_start !== undefined && chainInfo.start_res_num !== undefined) {
          chainInfo.shift = chainInfo.unp_start - chainInfo.start_res_num;
        } else if (chainInfo.unp_end !== undefined && chainInfo.end_res_num !== undefined) {
          chainInfo.shift = chainInfo.unp_end - chainInfo.end_res_num;
        } else {
          Log.w(1, 'impossible to determine shift');
          continue;
        }

        // calculate conversion objects
        for (const eId in resListObj) {
          if (+eId === chainInfo.entity_id) {
            tmp = resListObj[eId];
            if (ch in tmp) {
                this.autToUnpDict(tmp[ch], pdbInfo.chains[ch]);
                this.unpToAutArray(tmp[ch], unpSequence.sequence, pdbInfo.chains[ch]);
            }
          }
        }
      }
      // insert pdb structure inside pdbs object
      this.data.pdbs[pdb.pdb] = pdbInfo;
      console.log(this.data.pdbs[pdb.pdb]);
    }
    // insert uniprot object inside uniprots dict
    this.data.uniprots[unpSequence.id] = uniprotInfo;

    return this.data;
  }

  /** building aut_to_unp dict {'author_residue': 'uniprot index'} */
  private autToUnpDict(residues, obj) {
    // building aut_to_unp{} key: aut, value: unp
    let tmp;
    for (const res of residues) {

      const unpRes = res.residue_number + obj.shift;

      tmp = `${res.author_residue_number}${res.author_insertion_code}`;
      if (unpRes >= obj.unp_start && unpRes <= obj.unp_end) {
        obj.aut_to_unp[tmp] = unpRes;
      } else {
        obj.aut_to_unp[tmp] = 'u_' + unpRes.toString();
      }
    }
  }

  /** building unp_to_aut array [index: uniprot, value: 'author_residue'] */
  private unpToAutArray(residues, sequence: string, obj) {
    let residue;
    let residueNumber;

    for (let unpResidue = 1; unpResidue <= sequence.length; unpResidue++) {
      residueNumber = +unpResidue - obj.shift;
      residue = residues.find(i => i.residue_number === residueNumber);
      if (residue !== undefined) {
        obj.unp_to_aut[unpResidue] = residue.author_residue_number;
      } else {
        obj.unp_to_aut[unpResidue] = '-';
      }
    }

  }

}
