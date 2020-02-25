import {AfterViewChecked, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {FeatureViewer} from 'feature-viewer-typescript/lib';
import {DomSanitizer} from '@angular/platform-browser';
import {ChainInfo, DataFetcher, PdbInfo, UniprotInfo} from '../interfaces/dataFetcher/dataFetcher.interface';
import {DataFetcherModel} from '../models/dataFetcher/dataFetcher.model';
import {DataDownloadModel} from '../models/dataDownload/dataDownload.model';
import {StrucViewComponent} from '../structureViewer/struc-view.component';
import {FtModel} from '../models/featureViewer/featureViewer.model';
import {Log} from '../models/log.model';
import {pluck, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {Clicked, Stv} from '../interfaces/repKbColors.interface';
import {RepKbClModel} from '../models/repKbColors.model';
import {Identity, ValuesPdb, ValuesUnp} from '../interfaces/repKb.interfaces';

@Component({
  selector: 'app-reupro',
  templateUrl: './repKB.component.html',
  styles: ['@import "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";'],
  styleUrls: ['./repKB.component.css']
})

export class RepKBComponent implements OnInit, AfterViewChecked {
  constructor(private route: ActivatedRoute,
              private san: DomSanitizer,
              private cdRef: ChangeDetectorRef,
              private stvComp: StrucViewComponent) {
    const destroyed = new Subject<any>();
    this.route.params
      .pipe(takeUntil(destroyed), pluck('id'))
      .subscribe(id => this.unpId = id);

    this.dataFetcher = new DataFetcherModel();
    this.dataDownload = new DataDownloadModel(san);
    this.vlPdb = {disStartPdb: true, disEndPdb: true, stPdb: '-', endPdb: '-'};
    this.vlUnp = {disStartUnp: true, disEndUnp: true, stUnp: '-', endUnp: '-'};
  }

  @Input() event: Event;
  unpId: string;
  currUnp: UniprotInfo;
  featureList: Array<any>;
  dataFetcher: DataFetcherModel;
  dataDownload: DataDownloadModel;
  featureViewer: FeatureViewer;
  idt : Identity;
  vlPdb: ValuesPdb;
  vlUnp: ValuesUnp;
  stv: Clicked; sqv: Clicked;
  fileJson;
  multifasta;
  multicustom = [];
  lastSelectCustom;
  startUsrPdb;
  endUsrPdb;
  startUsrUnp;
  endUsrUnp;
  data;
  pdb;
  chain;
  lastClicked;
  input;
  colorations = ['Choose palette', 'clustal']; // add colorations here
  features = ['Choose feature', 'unit', 'insertion'];
  feature;
  arrEntryStv;
  arrEntrySqv;
  actualPdb;
  alert = 'Click on a pdb to start';
  error = '';
  unitsCus = [];
  insCus = [];
  lastPaintUnit = 'visible';
  lastPaintIns = 'visible';

  ngOnInit(): void {
    this.sqv = { chains: [], units: [], insertions: [], user: []};
    this.stv = { chains: [], units: [], insertions: [], user: []};
    this.idt = { chains: 'ch', units: 'uni', insertions: 'ins', user: 'usr'};
    this.featureList = [];
    this.arrEntryStv = [];
    this.updateView(this.unpId.toUpperCase());
  }

  public updateView(id) {
    this.unpId = id;

    this.dataFetcher.getData(this.unpId).then((data: DataFetcher) => {

      if (!data) {
        return;
      }
      this.data = data;
      this.currUnp = data.uniprots[this.unpId];

      // new Feature Viewer
      document.getElementById('fv').innerHTML = '';
      delete this.featureViewer;
      this.featureViewer = new FeatureViewer(this.currUnp.sequence, '#fv', FtModel.fvOptions);

      // fill Feature Viewer
      const featureList = [];
      featureList.push(FtModel.buildUnpFt(this.unpId, this.currUnp.sequence.length));

      let chFeature;
      let pdbInfo: PdbInfo;
      let chainInfo: ChainInfo;
      // tslint:disable-next-line:forin
      for (const pdb in this.currUnp.pdbs) {
        pdbInfo = data.pdbs[pdb];
        for (const chain of this.currUnp.pdbs[pdb].sort()) {
          chainInfo = pdbInfo.chains[chain];
          chFeature = FtModel.buildChFt(pdb, chainInfo);
          let subFt;
          let tooltip;
          [subFt, tooltip] = FtModel.buildRegFt(pdb, chainInfo);

          if (tooltip) {
            chFeature.sidebar[0].datax = `${chainInfo.unp_start}`,
            chFeature.sidebar[0].datay = `${chainInfo.unp_end}`,

            chFeature.sidebar[0].content = `<a>
                                            <i data-id="ch"
                                              data-pdb="${pdb}-${chainInfo.chain_id}"
                                              class="fa fa-paint-brush aria-hidden="true"></i></a>
                                            <a href="${FtModel.pdbUrl}${pdb}${chain}">`;
            chFeature.sidebar.push({
              id: `rpLink ${pdb}-${chain}`,
              tooltip: `RpsDb ${pdb}-${chain}`,
              content: `<a target="_blank" href="${FtModel.pdbUrl}${pdb}${chain}">
                    <i style="margin-top: 6px" class="fa fa-external-link"></i></a>` // RepeatsDb
            });
            chFeature.sidebar[1].tooltip = pdb + chain + ' | RpsDb additional info';

          }
          if (subFt.length > 0) {
            [chFeature.subfeatures, tooltip] = FtModel.buildRegFt(pdb, chainInfo);
          }
          featureList.push(chFeature);
        }
      }

      this.featureList = featureList;
      this.featureViewer.addFeatures(featureList);
      this.featureViewer.onRegionSelected(r => this.updateTools(r));
      this.featureViewer.onButtonSelected(r => this.paint(r));
      document.getElementsByClassName('loader')[0].className = '';
      document.getElementsByClassName('loaderMsg')[0].innerHTML = '';

      this.input = {
        rows: {
          1: {data: this.currUnp.sequence}
        },
        colors: {},
        parameters: {
          chunkSize: '5',
          spaceSize: '1',
          log: 'debug'
        }
      };

      // create json data to download
      this.fileJson = this.dataDownload.getJson(data, this.unpId);
    });

  }

  generateMultifasta() {
    if (this.feature === undefined) {
      return;
    }
    let multifasta = '';
    for (const e of this.multicustom) {
      let sq = '';
      for (let i = e.x - 1; i <= e.y - 1; i++) {
        sq += this.currUnp.sequence[i];
      }
      multifasta += '>' + this.feature.toUpperCase() + ' ' + e.x + '-' + e.y + '\n' + sq + '\n';
    }
    this.multifasta = this.dataDownload.getMultifasta(multifasta);
  }

  paint(event) {
    if (event.detail.id.includes('drop')){
      this.tint(event);
      return;
    }

    let pdb;
    let ch;
    this.stv.user = [];
    this.sqv.user = [];
    this.eraseAll();
    if (event.detail.id[0] === 'c') {
      const xy = [];
      let flag = true;
      for (const elem of this.featureList[0].data) {
        for (const i of xy) {
          if (elem.x === i.x && elem.y === i.y) {
            flag = false;
          }
        }
        if (flag) {
          xy.push(elem);
        }
        flag= true;
      }
      ch = this.lastClicked[this.lastClicked.length - 1];
      pdb = this.lastClicked.slice(0, -2);
      // TODO paint unit
      // xy should be from featureList insertions
      // this.updateEntity(xy, pdb, ch, this.idt.insertions);
      // TODO or paint insertion
      // xy should be from featureList insertions
      // this.updateEntity(xy, pdb, ch, this.idt.insertions);


    } else {
      const name = event.detail.id.substring(2);
      [pdb, ch] = name.split('-');
      if (event.detail.id[0] === 'u' ) {
        const xy = JSON.parse(event.detail.dataxy);
        this.updateEntity(xy, pdb, ch, this.idt.units);
      } else if (event.detail.id[0] === 'i') {
        const xy = JSON.parse(event.detail.dataxy);
        this.updateEntity(xy, pdb, ch, this.idt.insertions);
      }
    }
  }

  updateEntity(xy, pdb, ch, idt){
    for (const entity of xy) {
      const cl = RepKbClModel.hexToRgb(entity.color);
      this.updateSqv(entity.x, entity.y, idt, entity.color);
      this.updateStv(entity.x, entity.y, pdb, ch, idt, {r: cl.r, g: cl.g, b: cl.b}, xy.length);
    }
  }

  // change colors of selected custom features
  tint(event) {

    if (this.stv.user.length <= 0) {
      this.error = 'Click on a custom feature to start (green elements)';
      return;
    }

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.featureList[0].data.length; i++) {
      if (this.featureList[0].data[i].label === this.lastSelectCustom.pdb
        && this.featureList[0].data[i].x === this.lastSelectCustom.x
        && this.featureList[0].data[i].y === this.lastSelectCustom.y) {
        switch(event.detail.id) {
          case FtModel.drop.one: {
            this.featureList[0].data[i].color = FtModel.colorsHex.cOne;
            break;
          }
          case FtModel.drop.two: {
            this.featureList[0].data[i].color = FtModel.colorsHex.cTwo;
            break;
          }
          case FtModel.drop.three: {
            this.featureList[0].data[i].color = FtModel.colorsHex.custom;
            break;
          }
        }

      }
    }
    document.getElementById('fv').innerHTML = '';
    this.featureViewer = new FeatureViewer(this.currUnp.sequence, '#fv', FtModel.fvOptions);
    this.featureViewer.addFeatures(this.featureList);
    this.featureViewer.onRegionSelected(r => this.updateTools(r));
    this.featureViewer.onButtonSelected(r => this.paint(r));
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.stv.user.length; i++) {
      if (this.stv.user[i].start_residue_number === this.lastSelectCustom.x
        &&  this.stv.user[i].end_residue_number === this.lastSelectCustom.y) {
        switch(event.detail.id) {
          case FtModel.drop.one: {
            this.stv.user[i].color = RepKbClModel.hexToRgb(FtModel.colorsHex.cOne);
            break;
          }
          case FtModel.drop.two: {
            this.stv.user[i].color = RepKbClModel.hexToRgb(FtModel.colorsHex.cTwo);
            break;
          }
          case FtModel.drop.three: {
            this.stv.user[i].color = RepKbClModel.hexToRgb(FtModel.colorsHex.custom);
            break;
          }
        }

      }
    }
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.sqv.user.length; i++) {
      const reg = this.lastSelectCustom.x + '-' + this.lastSelectCustom.y;
      if (this.sqv.user[i].reg === reg) {
        switch(event.detail.id) {
          case FtModel.drop.one: {
            this.sqv.user[i].cl = FtModel.colorsHex.cOne;
            break;
          }
          case FtModel.drop.two: {
            this.sqv.user[i].cl = FtModel.colorsHex.cTwo;
            break;
          }
          case FtModel.drop.three: {
            this.sqv.user[i].cl = FtModel.colorsHex.custom;
            break;
          }
        }
      }
    }
    this.stvComp.deleteColor(this.arrEntryStv, this.stv);
    this.updateInput();
  }

  addCusEntity(entity, check) {
    if (entity) {
      let  flag = false;
      for (const ft of this.featureList) {
        if (ft.id === check) {
          flag = true;
          ft.data.push(entity.data[0]);
        }
      }
      // if custom unit was never added to the ftv before..
      if (!flag) {
        this.featureList.unshift(entity)
      }

      this.multicustom.push({id: entity.data[0].label, pdb: this.actualPdb,
        x: +this.vlUnp.stUnp, y: +this.vlUnp.endUnp, color: FtModel.colorsHex.custom, feature: this.feature});
    }
  }
  addCustom() {

    const e = 'Invalid action. Please check the input values.';
    this.error = '';
    if (this.featureList.length <= 0) {
      Log.w(1, 'nothing to draw on.');
      return;
    }

    if (this.feature === undefined) {
      this.error = 'Invalid action. Please select a feature.';
      return;
    }
    if (this.vlPdb.disStartPdb === null && (this.vlUnp.stUnp === '-' || this.vlUnp.endUnp === '-')) {
      this.error = e;
      return;
    } else if (this.vlUnp.disStartUnp === null && (this.startUsrUnp === undefined || this.endUsrUnp === undefined)) {
      this.error = e;
      return;
    }

    if (this.vlPdb.disStartPdb) {
      this.vlUnp.stUnp = this.startUsrUnp;
      this.vlUnp.endUnp = this.endUsrUnp;
    }

    if (this.vlUnp.stUnp === '-' || this.vlUnp.endUnp === '-' || +this.vlUnp.stUnp > +this.vlUnp.endUnp) {
      this.error = e;
      return;
    } else if (+this.vlUnp.stUnp === +this.vlUnp.endUnp) {
      this.error = 'Feature is too short to be showed.';
      return;
    }
    switch(this.feature) {
      case FtModel.custom.idUnit: {
        FtModel.idCustomUnit += 1;
        this.unitsCus.push({x:+this.vlUnp.stUnp, y:+this.vlUnp.endUnp, id: FtModel.idCustomUnit});
        this.insertCustom(FtModel.idCustomUnit, FtModel.custom.idUnit);
        this.hideBrush(this.vlUnp.stUnp, this.vlUnp.endUnp, this.unitsCus, FtModel.paint.unit);
        break;
      }
      case FtModel.custom.idIns: {
        FtModel.idCustomIns += 1;
        this.insCus.push({x:+this.vlUnp.stUnp, y:+this.vlUnp.endUnp, id: FtModel.idCustomIns});
        this.insertCustom(FtModel.idCustomIns, FtModel.custom.idIns);
        this.hideBrush(this.vlUnp.stUnp, this.vlUnp.endUnp, this.insCus, FtModel.paint.ins);
        break;
      }
    }

    if (this.unitsCus.length <= 1) {
      if (document.getElementById(FtModel.paint.unit)) {
        document.getElementById(FtModel.paint.unit).style.visibility = 'hidden';
      }
    }
    if (this.insCus.length <= 1) {
      if (document.getElementById(FtModel.paint.ins)) {
        document.getElementById(FtModel.paint.ins).style.visibility = 'hidden';
      }
    }
    this.generateMultifasta();
  }

  insertCustom (idElem, idCus) {

    let ft;
    ft = FtModel.buildCus(this.vlUnp.stUnp, this.vlUnp.endUnp, this.actualPdb, idCus, idElem);
    this.addCusEntity(ft, idCus);
    this.featureViewer.emptyFeatures();
    this.featureViewer.addFeatures(this.featureList);
    if (ft && ft.data.length > 0) {
      this.featureViewer.highlightRegion({x: ft.data[ft.data.length - 1].x,
        y: ft.data[ft.data.length - 1].y}, ft.id);
    }
  }
  hideBrush(st, end, arrCus, idPaint){
    console.log(idPaint)
    console.log(arrCus)
    // checking superposed features
    // if present, remove paint brush
    let insert = true;

    for (const j of arrCus) {
      let c = 0;

      for (const i of arrCus) {
      console.log(j)
      console.log(i.x)

      if (i.x >= j.x && i.x <= j.y || i.y >= j.x && i.y <= j.y) {

        c += 1;
        if (c > 1) {
          console.log('false')
          insert = false;
          break;
        }
      }
    }
   }

    console.log(insert)

    if(insert){
      console.log(idPaint)
      console.log('visible')

      if (document.getElementById(idPaint)) {
        document.getElementById(idPaint).style.visibility = 'visible';
      }
    } else {
      console.log('dupl')

      document.getElementById(idPaint).style.visibility = 'hidden';
    }


      switch (idPaint) {
        case FtModel.paint.unit: {
          if (document.getElementById(idPaint)) {
            this.lastPaintUnit = document.getElementById(FtModel.paint.unit).style.visibility;
            if (document.getElementById(FtModel.paint.ins)) {
              document.getElementById(FtModel.paint.ins).style.visibility = this.lastPaintIns;
            }
          }
          break;
        }
        case FtModel.paint.ins: {
          if (document.getElementById(idPaint)) {
            this.lastPaintIns = document.getElementById(FtModel.paint.ins).style.visibility;
            if (document.getElementById(FtModel.paint.unit)) {
              document.getElementById(FtModel.paint.unit).style.visibility = this.lastPaintUnit;
            }

          }
          break;
        }
      }
  }
  removeCustom(type: string) {

    if (this.featureList.length <= 0) {
      Log.w(1, 'nothing to draw on.');
      return;
    }
    let st;
    let end;
    if (type === 'selected') {
      st = this.lastSelectCustom.x;
      end = this.lastSelectCustom.y;
      for (let i = 0; i < this.multicustom.length; i++) {
        if (this.multicustom[i].id === this.lastSelectCustom.id) {
          this.multicustom.splice(i, 1);
        }
      }

      switch (this.lastSelectCustom.feature) {
        case FtModel.custom.idUnit:{
          this.removeSelected(this.lastSelectCustom, FtModel.custom.idUnit, this.unitsCus);
          this.featureViewer.emptyFeatures();
          this.featureViewer.addFeatures(this.featureList);
          this.hideBrush(st, end, this.unitsCus, FtModel.paint.unit);
          this.hideBrush(st, end, this.insCus, FtModel.paint.ins);
          break;
        }
        case FtModel.custom.idIns:{
          this.removeSelected(this.lastSelectCustom, FtModel.custom.idIns, this.insCus);
          this.featureViewer.emptyFeatures();
          this.featureViewer.addFeatures(this.featureList);
          this.hideBrush(st, end, this.unitsCus, FtModel.paint.unit);
          this.hideBrush(st, end, this.insCus, FtModel.paint.ins);
          break;
        }
      }
    } else if (type === 'last') {
      const last = this.multicustom.pop();
      if(!last) {
        return;
      }
      st = last.x;
      end = last.y;
      switch (last.feature) {
        case FtModel.custom.idUnit:{
          this.removeSelected(last, FtModel.custom.idUnit, this.unitsCus);
          this.featureViewer.emptyFeatures();
          this.featureViewer.addFeatures(this.featureList);
          this.hideBrush(st, end, this.unitsCus, FtModel.paint.unit);
          this.hideBrush(st, end, this.insCus, FtModel.paint.ins);

          break;
        }
        case FtModel.custom.idIns:{
          this.removeSelected(last, FtModel.custom.idIns, this.insCus);
          this.featureViewer.emptyFeatures();
          this.featureViewer.addFeatures(this.featureList);
          this.hideBrush(st, end, this.unitsCus, FtModel.paint.unit);
          this.hideBrush(st, end, this.insCus, FtModel.paint.ins);
          break;
        }
      }
    } else {
      this.multicustom = [];
      this.unitsCus = [];
      this.insCus = [];
      this.stv.user = [];
      this.stvComp.deleteColor(this.arrEntryStv, this.stv);
      this.sqv.user = [];
      this.updateInput();
      for (const ft in this.featureList) {
        if (this.featureList[ft].id === FtModel.custom.idUnit ||
            this.featureList[ft].id === FtModel.custom.idIns) {
          this.featureList.splice(+ft, 1)
        }
      }
    }
    if (this.unitsCus.length <= 1) {
      if (document.getElementById(FtModel.paint.unit)) {
        document.getElementById(FtModel.paint.unit).style.visibility = 'hidden';
      }
    }
    if (this.insCus.length <= 1) {
      if (document.getElementById(FtModel.paint.ins)) {
        document.getElementById(FtModel.paint.ins).style.visibility = 'hidden';
      }
    }
    this.generateMultifasta();
  }

  removeSelected(element, check, arrCus) {
    let flag = false;
    for (const ft in this.featureList) {
      if (this.featureList[ft].id === check) {
        flag = true;
        for (let i = 0; i < this.featureList[ft].data.length; i++) {
          if (this.featureList[ft].data[i].label === element.id) {
            this.featureList[ft].data.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }

    for (let i = 0; i < this.stv.user.length; i++) {
      if (this.stv.user[i].start_residue_number === element.x
        &&  this.stv.user[i].end_residue_number === element.y) {
        this.stv.user.splice(i, 1);
        i--;
      }
    }

    for (let i = 0; i < this.sqv.user.length; i++) {
      const reg = element.x + '-' + element.y;
      if (this.sqv.user[i].reg === reg) {
        this.sqv.user.splice(i, 1);
        i--;
      }
    }

    for (let i = 0; i < arrCus.length; i++) {
      if (arrCus[i].id === element.id) {
        arrCus.splice(i, 1);
        i--;
      }
    }
    console.log(arrCus)
    this.stvComp.deleteColor(this.arrEntryStv, this.stv);
    this.updateInput();
  }

  // real time user values conversion
  ngAfterViewChecked(): void {

    if (this.event !== undefined && this.unpId !== this.event.toString()) {
      this.updateView(this.event);
    }

    // PDB TO UNIPROT
    if (this.pdb !== undefined && this.data.pdbs[this.pdb] !== undefined) {
      const conv = this.data.pdbs[this.pdb].chains[this.chain].aut_to_unp;

      this.alert = '';
      this.vlPdb.disStartPdb = null; this.vlPdb.disEndPdb = null; this.vlUnp.disStartUnp = null; this.vlUnp.disEndUnp = null;

      if(this.startUsrPdb || this.endUsrPdb) {
        this.vlUnp.disStartUnp = true;
        this.vlUnp.disEndUnp = true;
      } else if (this.startUsrUnp || this.endUsrUnp) {
        this.vlPdb.disStartPdb = true;
        this.vlPdb.disEndPdb = true;
      }
      this.vlUnp.stUnp = this.assignVal(this.startUsrPdb, conv, this.vlUnp.stUnp);
      this.cdRef.detectChanges();
      this.vlUnp.endUnp = this.assignVal(this.endUsrPdb, conv, this.vlUnp.endUnp);
      this.cdRef.detectChanges();

    } else {
      // no user input
      this.vlUnp.stUnp =  '-';
      this.vlUnp.endUnp =  '-';
    }

    // UNIPROT TO PDB
    if (this.pdb !== undefined && this.data.pdbs[this.pdb] !== undefined) {
      const conv = this.data.pdbs[this.pdb].chains[this.chain].unp_to_aut;

      this.vlPdb.stPdb = this.assignVal(this.startUsrUnp, conv, this.vlPdb.stPdb);
      this.cdRef.detectChanges();
      this.vlPdb.endPdb = this.assignVal(this.endUsrUnp, conv, this.vlPdb.endPdb);
      this.cdRef.detectChanges();


    } else {
      // no user input
      this.vlPdb.stPdb =  '-';
      this.vlPdb.endPdb =  '-';
    }
  }

  assignVal(prevVal, arr, val) {
    if (prevVal in arr) {
      val = arr[prevVal];
      if (val[0] === 'u') {
        val =  '-';
      }
    } else {
      // user input outside convObj
      val =  '-';
    }
    return val;
  }

  updateTools(r) {

    // preprocess input
    const x = r.detail.selectedRegion.x;
    const y = r.detail.selectedRegion.y;
    let pdb;
    let ch;
    let identity;
    let rgb;

    const clickedColorHex = r.detail.selectedRegion.color;
    const clickedColorRgb = RepKbClModel.hexToRgb(clickedColorHex);

    let label;
    const xy = -1;
    // if custom label, take name of last clicked pdb
    if (r.detail.id === FtModel.custom.idUnit || r.detail.label === FtModel.custom.idIns) {
      this.error = '';
      if (clickedColorHex === FtModel.colorsHex.transp) {
        return;
      }

      this.lastSelectCustom = {id: r.detail.selectedRegion.label, pdb: r.detail.label, x, y, feature: r.detail.id};
      label = this.lastClicked;
      label = 'c-' + label;

    } else {
      label = r.detail.label;
      this.lastClicked = label;
    }

    if (label[0] === 'u') {
      label = label.substring(2);
      identity = this.idt.units;
    } else if (label[0] === 'i') {
      label = label.substring(2);
      identity = this.idt.insertions;

    } else if (label[0] === 'c') {
      label = label.substring(2);
      identity = this.idt.user;

    } else {
      identity = this.idt.chains;
    }
    rgb = {r: clickedColorRgb.r, g: clickedColorRgb.g, b: clickedColorRgb.b};

    [pdb, ch] = label.split('-');

    this.pdb = pdb;
    this.chain = ch;
    const clickedPdb = pdb + ch;

    if (this.actualPdb !== undefined ) {
      const actualPdb = this.actualPdb.substring(0, this.actualPdb.length - 1);
      if(actualPdb !== this.pdb) {
        [this.arrEntryStv, this.arrEntrySqv, this.stv, this.sqv] =
          RepKbClModel.emptyArr(this.arrEntryStv, this.arrEntrySqv, this.stv, this.sqv, true);
      } else if (this.actualPdb !== clickedPdb){
        [this.arrEntryStv, this.arrEntrySqv, this.stv, this.sqv] =
          RepKbClModel.emptyArr(this.arrEntryStv, this.arrEntrySqv, this.stv, this.sqv, false);
      }
    }

    this.updateStv(x, y, pdb, ch, identity, rgb, xy);
    this.updateSqv(x, y, identity, clickedColorHex);
    this.actualPdb = clickedPdb;
  }

  updateStv(st, end, pdb, ch, identity, rgb, xy) {
    const chains = this.data.pdbs[pdb].chains;
    console.log(chains[ch])

    if (identity === this.idt.user) {
      // tslint:disable-next-line:forin
      for (const chain in this.data.pdbs[pdb].chains) {
        let stUnp;
        let endUnp;

        // coloring structure viewer
        for (let i = st; i <= end; i ++) {
          if (i in chains[chain].unp_to_aut && chains[chain].unp_to_aut[i] !== '-') {
            stUnp = st;
            break;
          } else {
            this.error = 'this feature is not fully visible on the selected pdb structure';
          }
        }
        for (let i = end; i >= st; i --) {
          if (end in chains[chain].unp_to_aut && chains[chain].unp_to_aut[i] !== '-') {
            endUnp = end;
            break;
          } else {
            this.error = 'this feature is not fully visible on the selected pdb structure';
          }
        }
        if (stUnp !== undefined && endUnp !== undefined) {
          // litemol uses residue numbers to color, but displays author residue
          stUnp = stUnp - this.data.pdbs[pdb].chains[ch].shift;
          endUnp = endUnp - this.data.pdbs[pdb].chains[ch].shift;
          const stvInfo = RepKbClModel.createStvInfo(rgb, chains, chain, stUnp, endUnp);
          this.arrEntryStv = this.stvComp.updateView(xy, this.arrEntryStv, this.stv,
            pdb.toLowerCase(),
            ch,
            identity, // region or units/insertions
            stvInfo
          );
        }
      }
    } else {
      // coloring structure viewer
      // convert from uniprot values to pdb
      st = st - this.data.pdbs[pdb].chains[ch].shift;
      end = end - this.data.pdbs[pdb].chains[ch].shift;
      // TODO correcting ebi wrong data for uniprot Q13835
      //  better would be to check data during retrival and try to correct them there
      if (pdb === '1xm9') {
        end = 457;
      }

      const stvInfo = RepKbClModel.createStvInfo(rgb, chains, ch, st, end);
      this.arrEntryStv = this.stvComp.updateView(xy, this.arrEntryStv, this.stv,
        pdb.toLowerCase(),
        ch,
        identity, // region or units/insertions
        stvInfo);
    }
  }

  updateSqv(st, end, identity, cl) {
    const reg = st + '-' + end;
    const obj = {reg, cl};
    RepKbClModel.insElem(identity, this.arrEntrySqv, obj, this.sqv, 'sqv', true);
    this.updateInput();
  }

  selectedFeature (event: any) {
    this.feature = 'custom-' + event.target.value;
  }

  selectChangeHandler(event: any) {
    const selected = event.target.value;

    if (selected === 'clustal') {
      this.input = {
        rows: {
          1: {data: this.currUnp.sequence}
        },
        colors: {
          '@amino@': [
            {row: '1', color: '@adjacent', target: 'background'}
          ]
        },
        parameters: {
          chunkSize: '5',
          log: 'debug'
        }
      };
    }
  }

  updateInput() {

    this.arrEntrySqv = RepKbClModel.pushArr(this.arrEntrySqv, this.sqv,true);
    const colors = {};

    for (const e of this.arrEntrySqv) {
      colors[e.reg] = [];
      colors[e.reg].push({row: 1, color: e.cl});
    }

    this.input = {
      rows: {
        1: {data: this.currUnp.sequence}
      },
      colors,
      parameters: {
        chunkSize: '5',
        log: 'none'
      }
    };
  }

  eraseAll() {
    [this.arrEntryStv, this.arrEntrySqv, this.stv, this.sqv] =
      RepKbClModel.emptyArr(this.arrEntryStv, this.arrEntrySqv, this.stv, this.sqv, true);
    this.stvComp.deleteColor(this.arrEntryStv, this.stv);
    this.updateInput();
  }
}
