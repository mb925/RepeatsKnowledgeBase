import {ChainInfo} from '../../interfaces/dataFetcher/dataFetcher.interface';
import {Entity} from '../../interfaces/dataFetcher/pdbEntity.interface';
import {Log} from '../log.model';

export class FtModel {

  static unpUrl = 'https://www.uniprot.org/uniprot/';
  static chaUrl = 'http://www.rcsb.org/structure/';
  static pdbUrl = 'http://repeatsdb.bio.unipd.it/protein/';
  static fvOptions = {
    showAxis: true, showSequence: true, toolbar: true,
    toolbarPosition: 'left', zoomMax: 10, sideBar: 200,
    flagColor: '#DFD5F5', showSubFeatures: true, backgroundcolor: 'white',
    flagTrack: 150,
    flagTrackMobile: 150
  };

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
    idUnit: 'custom-unit',
    idIns: 'custom-insertion'
  };
  static idCustomUnit = 0;
  static idCustomIns = 0;

  static drop = {
    unitOne: 'custom-unit-drop-one',
    unitTwo: 'custom-unit-drop-two',
    unitThree: 'custom-unit-drop-three',
    insOne: 'custom-insertion-drop-one',
    insTwo: 'custom-insertion-drop-two',
    insThree: 'custom-insertion-drop-three'
  };

  static paint = {
    unit: 'c-paint-custom-unit',
    ins: 'c-paint-custom-insertion'
  };

  /** Custom entities */
  static buildCus(start: string, end: string, actualPdb: string, feature: string, dtLabel: number) {
    const x = +start;
    const y = +end;

    return {
      type: 'rect',
      label: feature,
      id: feature,
      data: [{x, y, color: this.colorsHex.custom, label: dtLabel}],
      isOpen: true,
      sidebar: [
        {
          id: feature + '-drop-one',
          tooltip: actualPdb,
          content: `<i class="fa fa-tint" id="cOne"></i>`,
        },
        {
          id: feature + 'drop-two',
          content: `<i class="fa fa-tint" id="cTwo"></i>`

        },
        {
          id: feature + 'drop-three',
          content: `<i class="fa fa-tint" id="cThree"></i>`
        },
        {
          id: 'c-paint-' + feature,
          content: `<i data-id='usr' class='fa fa-paint-brush'></i>`
        }

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
          content: `<a target="_blank" href="${FtModel.unpUrl}${uniprotId}"><i class="fa fa-link"></i></a>`,
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
    res.sidebar[0].content =  `<a target="_blank" href="${FtModel.chaUrl}${pdb}">
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

      obj = FtModel.convertEntities(region.units, chainInfo);
      Array.prototype.push.apply(convUnits, obj.convertedEntities);
      if (obj.flagAdditional === false) {
        obj = FtModel.convertEntities(region.insertions, chainInfo);
        Array.prototype.push.apply(convIns, obj.convertedEntities);
      } else {
        obj = FtModel.convertEntities(region.insertions, chainInfo);
        Array.prototype.push.apply(convIns, obj.convertedEntities);
        flagAdditional = true;
      }
    }

    if (convUnits.length > 0) {
      result.push(FtModel.buildEntityFt(FtModel.custom.idUnit, pdb, chainInfo.chain_id, convUnits));
    }

    if (convIns.length > 0) {
      result.push(FtModel.buildEntityFt(FtModel.custom.idIns, pdb, chainInfo.chain_id, convIns));
    }
    return [result, flagAdditional];

  }

  private static buildEntityFt(
    feature: string, pdb: string, chain: string, data: Array<{x: number, y: number, color: string}>) {

    let label;
    switch (feature) {
      case this.custom.idUnit: {
        label = `u-${pdb}-${chain}`;
        let flag = true;
        if (data.length > 1) {

          for (const elem of data) {
            if (flag) {
              elem.color = this.colorsHex.unitsDark;
              flag = !flag;
              continue;
            }
            elem.color = this.colorsHex.unitsLight;
            flag = !flag;
          }
        }
        break;
      }
      case this.custom.idIns: {
        label = `i-${pdb}-${chain}`;
        for (const elem of data) {
          elem.color = this.colorsHex.insertions;
        }
        break;
      }
    }
    const dt = JSON.stringify(data);
    let paint = { id: `none`,
      tooltip: ``,
      dataxy: ``,
      content: `<a></a>`};

    if(data.length > 1){
      paint = {
        id: `${label}`,
        tooltip: `paint`,
        dataxy: `${dt}`,
        content: `<a><i class="fa fa-paint-brush"></i></a>`
      }
    }
    return {
      type: 'rect',
      id: label,
      data,
      isOpen: true,
      sidebar: [
        {
          id: `rpLink-${pdb}-${chain}`,
          tooltip: `RpsDb ${pdb}-${chain}`,
          content: `<a target="_blank" href="${FtModel.pdbUrl}${pdb}${chain}">
                    <i class="fa fa-external-link"></i></a>`
        },
        paint
      ]
    };

  }

  public static convertEntities(entities: Array<Entity>, convObj) {
    let flagAdditional = false;
    const convertedEntities = [];
    let start: number;
    let end: number;

    for (const entity of entities) {

      start = FtModel.convertBound(entity.start, convObj.aut_to_unp);
      end = FtModel.convertBound(entity.end, convObj.aut_to_unp);

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


  public static switchDrop(eventId) {
    let color;
    console.log(eventId)
    console.log(this.drop.unitOne)
    switch(eventId) {

      case this.drop.unitOne || this.drop.insOne: {


        color = this.colorsHex.cOne;
        break;
      }
      case this.drop.unitTwo || this.drop.insTwo: {
        color = this.colorsHex.cTwo;
        break;
      }
      case this.drop.unitThree || this.drop.insThree: {
        color = this.colorsHex.custom;
        break;
      }
    }
    return color;
  }
}
