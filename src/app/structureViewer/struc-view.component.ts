import {Component, Injectable, OnInit} from '@angular/core';
import {StrucViewService} from './struc-view.service';

@Injectable({
  providedIn: 'root'
})

@Component({
  selector: 'app-stv',
  template: '<div id="litemol"></div>',
  styleUrls: ['./struc-view.component.scss']
})

export class StrucViewComponent implements OnInit {

  pdbName;

  constructor(private struc: StrucViewService) {

    this.pdbName = -1;
  }

  ngOnInit(): void {

    this.struc.draw('', []);
  }

  async updateView(xy, arr, clicked, pdbName, ch, identity, obj) {

    if (identity === 'ch') {
      this.insertClickElem(obj, clicked.chains);
    } else if (identity === 'uni') {
      this.insertClickElem(obj, clicked.units);
    } else if (identity === 'ins') {
      this.insertClickElem(obj, clicked.insertions);
    } else if (identity === 'usr') {
      this.insertClickElem(obj, clicked.user);
    }

    arr = [];
    Array.prototype.push.apply(arr, clicked.chains);
    Array.prototype.push.apply(arr, clicked.units);
    Array.prototype.push.apply(arr, clicked.insertions);
    Array.prototype.push.apply(arr, clicked.user);


    // when using paint button, draw the molecule only when the array is filled completely
    if (xy !== -1 && arr.length !== xy) {
      return;
    }

    if (this.pdbName === -1) {
      // delete plugin and colors
      this.struc.destroy();
    }

    if (this.pdbName !== pdbName) {

      if (this.pdbName !== -1) {
        // delete plugin and colors
        this.struc.destroy();
        clicked.chains = [];
        clicked.units = [];
        clicked.insertions = [];
        arr = [];

        if (identity === 'ch') {
          this.insertClickElem(obj, clicked.chains);
        } else if (identity === 'uni') {
          this.insertClickElem(obj, clicked.units);
        } else if (identity === 'ins') {
          this.insertClickElem(obj, clicked.insertions);
        }

        arr = [];
        Array.prototype.push.apply(arr, clicked.chains);
        Array.prototype.push.apply(arr, clicked.units);
        Array.prototype.push.apply(arr, clicked.insertions);

      }

      this.struc.draw(pdbName, arr)
        .then(() =>  this.struc.colorSeq(arr));
      this.pdbName = pdbName;

    } else {
      this.struc.colorSeq(arr);
    }

    return arr;
  }

  insertClickElem(obj, arr) {

    let elem;
    let flag = true;
    for (let i = 0; i < arr.length; i++) {
      elem = arr[i];
      if ((obj.struct_asym_id !==  elem.struct_asym_id)
        || (obj.start_residue_number !==  elem.start_residue_number)
        || (obj.end_residue_number !==  elem.end_residue_number)
        || ((JSON.stringify(obj.color) !== JSON.stringify(elem.color)))) {
        continue;
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


  deleteColor(arr, clicked) {
    arr = [];
    Array.prototype.push.apply(arr, clicked.chains);
    Array.prototype.push.apply(arr, clicked.units);
    Array.prototype.push.apply(arr, clicked.insertions);
    Array.prototype.push.apply(arr, clicked.user);
    this.struc.colorSeq(arr);
  }
}
