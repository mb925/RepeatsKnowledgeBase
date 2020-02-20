import {ChainInfo} from '../../interfaces/dataFetcher.interface';
import {Entity} from '../../interfaces/pdbEntity.interface';
import {Log} from '../log.model';

export class FeatureViewerModel {

  static unpUrl = 'https://www.uniprot.org/uniprot/';
  static chaUrl = 'http://www.rcsb.org/structure/';
  static pdbUrl = 'http://repeatsdb.bio.unipd.it/protein/';
  static colorsHex = {
    uniprot: '#70B77E',
    chains: '#D62839',
    unitsLight: '#00709B',
    unitsDark: '#03256C',
    insertions: '#F2BB05',
    custom: '#1C7C54',
    cOne: '#E36414',
    cTwo: '#8D6A9F',
    transp:  '#FFFFFFFF'
  };
  static custom = {
    labelUnit: 'custom-unit',
    labelIns: 'custom-insertion'
  };
  static idCustomUnit = 0;
  static idCustomInsertion = 0;


  /** Custom unit */
  static buildCusUnit(start: string, end: string, sequenceLength: number, actualPdb: string) {

    const x = +start;
    const y = +end;
    if (isNaN(x) || isNaN(y)) {
      Log.w(1, 'non-numeric field for custom entity.');
      return undefined;
    }

    if (x < 1 || y > sequenceLength) {
      Log.w(1, 'out-of-bounds custom entity.');
      return undefined;
    }

    if (x >= y) {
      Log.w(1, 'entity start is after entity end.');
      return undefined;
    }
    this.idCustomUnit += 1;
    return {
      type: 'rect',
      label: this.custom.labelUnit,
      id: this.custom.labelUnit,
      data: [{x, y, color: this.colorsHex.custom, label: this.idCustomUnit}],
      isOpen: true,
      sidebar: [
        {
          id: `drop-One`,
          tooltip: actualPdb,
          content: `<i class="fa fa-tint" id="cOne"></i>`,
        },
        {
          id: 'drop-Two',
          content: `<i class="fa fa-tint" id="cTwo"></i>`

        },
        {
          id: 'drop-Three',
          content: `<i class="fa fa-tint" id="cThree"></i>`
        },
        // {
        //   id: 'c-paint',
        //   content: `<a id="usr"></a>`
        // }

      ]
    };

  }


  /** Custom insertions */
  static buildCusInsertion(start: string, end: string, sequenceLength: number, actualPdb: string) {

    const x = +start;
    const y = +end;
    if (isNaN(x) || isNaN(y)) {
      Log.w(1, 'non-numeric field for custom entity.');
      return undefined;
    }

    if (x < 1 || y > sequenceLength) {
      Log.w(1, 'out-of-bounds custom entity.');
      return undefined;
    }

    if (x >= y) {
      Log.w(1, 'entity start is after entity end.');
      return undefined;
    }
    this.idCustomInsertion += 1;
    return {
      type: 'rect',
      label: this.custom.labelIns,
      id: this.custom.labelIns,
      data: [{x, y, color: this.colorsHex.custom, label: this.idCustomInsertion}],
      isOpen: true,
      sidebar: [
        {
          id: `drop-One`,
          tooltip: actualPdb,
          content: `<i class="fa fa-tint" id="cOne"></i>`,
        },
        {
          id: 'drop-Two',
          content: `<i class="fa fa-tint" id="cTwo"></i>`

        },
        {
          id: 'drop-Three',
          content: `<i class="fa fa-tint" id="cThree"></i>`
        },
        // {
        //   id: 'c-paint',
        //   content: `<a id="usr"></a>`
        // }

      ]
    };

  }

  /** Uniprot entity */
  static buildUnpFt(uniprotId: string, sequenceLength: number) {
    return {
      type: 'rect', color: this.colorsHex.uniprot,
      label: uniprotId,
      id: `p-${uniprotId}`,
      data: [
        { x: 1, y: sequenceLength }
      ],
      sidebar: [
        {
          id: 'unpLink',
          tooltip: 'UNIPROT ' + uniprotId,
          content: `<a href="${FeatureViewerModel.unpUrl}${uniprotId}"><i class="fa fa-link"></i></a>`,
        }
      ]
    };
  }

  /** Pdb chain entities */
  static buildChFt(pdb: string, chainInfo: ChainInfo) {
    const res =  {
      type: 'rect',
      label: `${pdb}-${chainInfo.chain_id}`,
      id: `c-${pdb}-${chainInfo.chain_id}`,
      data: [],
      isOpen: true,
      sidebar: [
        {
          id: `pdbLink-${pdb}-${chainInfo.chain_id}`,
          tooltip: `PDB ${pdb}-${chainInfo.chain_id}`,
          content: ''
        }
      ]
    };

    res.data.push({x: chainInfo.unp_start, y: chainInfo.unp_end, color: this.colorsHex.chains});
    res.sidebar[0].content =  `<a href="${FeatureViewerModel.chaUrl}${pdb}">
                                    <i style="margin-top:5px;" class="fa fa-external-link-square" ></i></a>`;
    return res;
  }

  /** Units, insertions entities */
  static buildRegFt(pdb: string, chainInfo: ChainInfo) {

    const result = [];
    const regions = chainInfo.regions;
    let flagAdditional = false;
    let obj;

    const convUnits = [];
    const convIns = [];
    for (const region of regions) {

      obj = FeatureViewerModel.convertEntities(region.units, chainInfo);
      Array.prototype.push.apply(convUnits, obj.convertedEntities);
      if (obj.flagAdditional === false) {
        obj = FeatureViewerModel.convertEntities(region.insertions, chainInfo);
        Array.prototype.push.apply(convIns, obj.convertedEntities);
      } else {
        obj = FeatureViewerModel.convertEntities(region.insertions, chainInfo);
        Array.prototype.push.apply(convIns, obj.convertedEntities);
        flagAdditional = true;
      }
    }

    if (convUnits.length > 0) {
      result.push(FeatureViewerModel.buildEntityFt('units', pdb, chainInfo.chain_id, convUnits));
    }

    if (convIns.length > 0) {
      result.push(FeatureViewerModel.buildEntityFt('insertions', pdb, chainInfo.chain_id, convIns));
    }
    return [result, flagAdditional];

  }

  private static buildEntityFt(
    feature: string, pdb: string, chain: string, data: Array<{x: number, y: number, color: string}>) {

    let label = `u-${pdb}-${chain}`;

    // insertions
    if (feature !== 'units' && data.length > 0) {
      for (const elem of data) {
        elem.color = this.colorsHex.insertions;
      }
      label = `i-${pdb}-${chain}`;
    }
    let flag = true;
    // units
    if (feature === 'units' && data.length > 1) {

      for (const elem of data) {
        if (flag) {
          elem.color = this.colorsHex.unitsDark;
          flag = !flag;
          continue;
        }
        elem.color = this.colorsHex.unitsLight;
        flag = !flag;
      }
      const dt = JSON.stringify(data);
      return {
        type: 'rect',
        id: label,
        data,
        isOpen: true,
        sidebar: [
          {
            id: `rpLink-${pdb}-${chain}`,
            tooltip: `RpsDb ${pdb}-${chain}`,
            content: `<a href="${FeatureViewerModel.pdbUrl}${pdb}${chain}">
                    <i class="fa fa-external-link"></i></a>`
          },
          {
            id: `${label}`,
            tooltip: `paint`,
            dataxy: `${dt}`,
            content: `<a><i class="fa fa-paint-brush"></i></a>`
          }
        ]
      };
    } else { // if I have a single element I don't need the paint brush
      return {
        type: 'rect',
        id: label,
        data,
        isOpen: true,
        sidebar: [
          {
            id: `rpLink-${pdb}-${chain}`,
            tooltip: `RpsDb ${pdb}-${chain}`,
            content: `<a href="${FeatureViewerModel.pdbUrl}${pdb}${chain}">
                    <i class="fa fa-external-link" aria-hidden="true"></i></a>` // RepeatsDb
          }
        ]
      };
    }
  }

  public static convertEntities(entities: Array<Entity>, convObj) {
    let flagAdditional = false;
    const convertedEntities = [];
    let start: number;
    let end: number;

    for (const entity of entities) {

      start = FeatureViewerModel.convertBound(entity.start, convObj.aut_to_unp);
      end = FeatureViewerModel.convertBound(entity.end, convObj.aut_to_unp);

      if (start === undefined && end === undefined) {
        // Log.w(1, 'unit completely outside the uniprot.');
        flagAdditional = true;
        continue;
      } else if (start === undefined) {
        // Log.w(1, 'unit start outside the uniprot.');
        flagAdditional = true;
        start = convObj.unp_start;
      } else if (end === undefined) {
        flagAdditional = true;
        // Log.w(1, 'unit end outside the uniprot.');
        end = convObj.unp_end;
      }

      convertedEntities.push({x: start, y: end});
    }
    const obj = {
      convertedEntities,
      flagAdditional
    };

    return obj;
  }

  private static convertBound(bound: number, convObj: {[aut: string]: number}) {

    if (!(bound in convObj)) {
      // Log.w(1,  'bound not in conversion object.');
      return undefined;
    }

    const convBound = convObj[bound];
    if (typeof convBound === 'string') {
      // Log.w(1,  'unit outside uniprot boundary');
      return undefined;
    }

    return convBound;
  }

}
