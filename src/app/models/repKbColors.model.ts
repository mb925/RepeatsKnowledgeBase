import {Stv} from '../interfaces/repKbColors.interface';
import { FtModel } from './featureViewer/featureViewer.model';

export class RepKbClModel {

  static hideBrush(st, end, arrCus, idPaint){

    // checking superposed features
    // if present, remove paint brush
    let insert = true;
    let lastPaintUnit;
    let lastPaintIns;

    for (const j of arrCus) {
      let c = 0;

      for (const i of arrCus) {

        if (i.x >= j.x && i.x <= j.y || i.y >= j.x && i.y <= j.y) {

          c += 1;
          if (c > 1) {
            insert = false;
            break;
          }
        }
      }
    }

    if(insert){
      if (document.getElementById(idPaint)) {
        document.getElementById(idPaint).style.visibility = 'visible';
      }
    } else {
      document.getElementById(idPaint).style.visibility = 'hidden';
    }

    switch (idPaint) {
      case FtModel.paint.unit: {
        if (document.getElementById(idPaint)) {
          lastPaintUnit = document.getElementById(FtModel.paint.unit).style.visibility;
          if (document.getElementById(FtModel.paint.ins)) {
            document.getElementById(FtModel.paint.ins).style.visibility = lastPaintIns;
          }
        }
        break;
      }
      case FtModel.paint.ins: {
        if (document.getElementById(idPaint)) {
          lastPaintIns = document.getElementById(FtModel.paint.ins).style.visibility;
          if (document.getElementById(FtModel.paint.unit)) {
            document.getElementById(FtModel.paint.unit).style.visibility = lastPaintUnit;
          }
        }
        break;
      }
    }
    return [lastPaintUnit, lastPaintIns];
  }



  static createStvInfo (rgb, chains, ch, st, end) {
    const stvInfo: Stv = {
      entity_id: '',
      struct_asym_id: '',
      start_residue_number: 0,
      end_residue_number: 0,
      color: rgb
    };
    stvInfo.entity_id = chains[ch].entity_id.toString();
    stvInfo.struct_asym_id = chains[ch].struct_asym_id;
    stvInfo.start_residue_number = st;
    stvInfo.end_residue_number = end;
    return stvInfo;
  }

  static insElem(id, arr, obj, ck, tool, user) {

    if (id === 'ch') {
      RepKbClModel.insertClickElem(obj, ck.chains, tool);
    } else if (id === 'uni') {
      RepKbClModel.insertClickElem(obj, ck.units, tool);
    } else if (id === 'ins') {
      RepKbClModel.insertClickElem(obj, ck.insertions, tool);
    } else if (id === 'usr' && user) {
      RepKbClModel.insertClickElem(obj, ck.user, tool);
    }
  }

  static insertClickElem(obj, arr, condition) {
    let elem;
    let flag = true;
    for (let i = 0; i < arr.length; i++) {
      elem = arr[i];
    switch(condition){
      case 'stv': {
        if ((obj.struct_asym_id !==  elem.struct_asym_id)
          || (obj.start_residue_number !==  elem.start_residue_number)
          || (obj.end_residue_number !==  elem.end_residue_number)
          || ((JSON.stringify(obj.color) !== JSON.stringify(elem.color)))) {
          continue;
        }
        break;
      }
      case 'sqv': {

        if ((obj.reg !==  elem.reg) && (obj.color !==  elem.reg)) {
          continue;
        }
        break;
      }
    }
      // Delete current element and break
      arr.splice(i, 1);
      flag = false;
      break;
    }
    if (flag) {
      delete obj.pdb;
      arr.push(obj);
    }
  }

  static pushArr(arr, ck, user) {
    arr = [];
    Array.prototype.push.apply(arr, ck.chains);
    Array.prototype.push.apply(arr, ck.units);
    Array.prototype.push.apply(arr, ck.insertions);
    if (user) {
      Array.prototype.push.apply(arr, ck.user);
    }
    return arr;
  }

  static emptyArr(arrEntryStv, arrEntrySqv, stv, sqv, user) {
    arrEntryStv = [];
    stv.chains  = [];
    stv.units = [];
    stv.insertions = [];
    arrEntrySqv = [];
    sqv.chains  = [];
    sqv.units = [];
    sqv.insertions = [];

    if(user) {
      stv.user = [];
      sqv.user = [];
    }

    return [arrEntryStv, arrEntrySqv, stv, sqv]
  }

  static hexToRgb(hex) {

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

}
