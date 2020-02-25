import {Component, Injectable, OnInit} from '@angular/core';
import {StrucViewService} from './struc-view.service';
import {FtModel} from '../models/featureViewer/featureViewer.model';
import {RepKbClModel} from '../models/repKbColors.model';

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

  async updateView(xy, arr, ck, pdbName, ch, id, obj) {

    RepKbClModel.insElem(id, arr, obj,ck, 'stv', true);
    arr = RepKbClModel.pushArr(arr, ck,true);
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
        ck.chains = [];
        ck.units = [];
        ck.insertions = [];
        arr = [];

        RepKbClModel.insElem(id, arr, obj,ck, 'stv', false);
        arr = RepKbClModel.pushArr(arr, ck,false);
      }

      this.struc.draw(pdbName, arr)
        .then(() =>  this.struc.colorSeq(arr));
      this.pdbName = pdbName;
    } else {
      this.struc.colorSeq(arr);
    }
    return arr;
  }

  deleteColor(arr, ck) {
    arr = RepKbClModel.pushArr(arr, ck,true);
    this.struc.colorSeq(arr);
  }
}
