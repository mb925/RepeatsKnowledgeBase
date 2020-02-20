import {ChainInfo, DataDownload, Pdbs, Region, Uniprot} from '../../interfaces/dataDownload.interface';
import {DomSanitizer} from '@angular/platform-browser';
import {FtModel} from '../featureViewer/featureViewer.model';


export class DataDownloadModel {

  static dataTxt;
  static json: DataDownload;

  constructor(private sanitizer: DomSanitizer) {
  }

  public getJson(data , id) {


    const uniprot: Uniprot = {id, seq: data.uniprots[id]};
    const pdbs: Pdbs = {};

    // tslint:disable-next-line:forin
    for (const pdb in data.pdbs) {
      pdbs[pdb] = {};
      // tslint:disable-next-line:forin
      for (const ch in data.pdbs[pdb].chains) {
        let chInfo: ChainInfo;
        chInfo = {
        unp_start: data.pdbs[pdb].chains[ch].unp_start,
        unp_end: data.pdbs[pdb].chains[ch].unp_end,
        pdb_indexes: Object.keys(data.pdbs[pdb].chains[ch].aut_to_unp)
       };

        if (data.pdbs[pdb].chains[ch].regions) {

          const arrReg = [];

          for (const region of data.pdbs[pdb].chains[ch].regions) {
            const reg: Region = {};

            reg.classification = region.classification;
            const units = FtModel.convertEntities(
              region.units, data.pdbs[pdb].chains[ch]
            ).convertedEntities;
            if (units.length > 0) {
              reg.units = units;
              reg.start = reg.units[0].x;
              reg.end = reg.units[reg.units.length - 1].y;
            }
            const insertions = FtModel.convertEntities(
              region.insertions, data.pdbs[pdb].chains[ch]
            ).convertedEntities;
            if (insertions.length > 0) {
              reg.insertions = insertions;
            }
            arrReg.push(reg);
          }
          chInfo.repeatsDb_reg = arrReg;
          pdbs[pdb][ch] = chInfo;
        }
      }
    }
    DataDownloadModel.json = {uniprot, pdbs};
    DataDownloadModel.dataTxt =  JSON.stringify(DataDownloadModel.json, null, '\t');
    const blob = new Blob([DataDownloadModel.dataTxt], {type: 'application/octet-stream'});
    return this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
  }

  public getMultifasta(str) {
    const blob = new Blob([str], {type: 'application/octet-stream'});
    return this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(blob));
  }
}
