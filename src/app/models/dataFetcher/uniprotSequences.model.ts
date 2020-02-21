import {Log} from '../log.model';
import {Uniprot} from '../../interfaces/dataFetcher/uniprot.interface';
import {QueryExtractor} from './queryExecutor.abstract';

export class UniprotSequencesModel extends QueryExtractor {

  data: Uniprot;

  constructor() {
    super('https://www.ebi.ac.uk/proteins/api/proteins/');
    this.data = {id: 'Default', sequence: 'Data not retrieved yet'};
  }

  /** Get general uniprot info */
  public async getData(id) {

    try {
      id = id.toUpperCase();
    } catch (e) {
      Log.w(1, 'id is not a string.');
      return undefined;
    }

    const res = await this.query(id);

    if (res.sequence === undefined || res.sequence.sequence === undefined) {
      Log.w(1, 'missing sequence in Ebi response.');
      return undefined;
    }

    if (typeof res.sequence.sequence !== 'string') {
      Log.w(1, 'wrong type for sequence in Ebi response.');
      return undefined;
    }

    if (res.sequence.sequence.length <= 0) {
      Log.w(1, 'empty sequence in Ebi response.');
      return undefined;
    }

    this.data.id = id;
    this.data.sequence = res.sequence.sequence.toUpperCase();
    return this.data;
  }
}
