export class RepKbClModel {

  static hexToRgb(hex) {

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
   } : null;
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
}
