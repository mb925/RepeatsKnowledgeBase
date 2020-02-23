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
      .subscribe(id => this.uniprotId = id);

    this.dataFetcher = new DataFetcherModel();
    this.dataDownload = new DataDownloadModel(san);
  }

  @Input() event: Event;
  uniprotId: string;
  currentUniprot: UniprotInfo;
  featureList: Array<any>;
  dataFetcher: DataFetcherModel;
  dataDownload: DataDownloadModel;
  featureViewer: FeatureViewer;
  fileJson;
  multifasta;
  multicustom = [];
  lastSelectCustom;
  startUsrPdb;
  endUsrPdb;
  startUsrUnp;
  endUsrUnp;
  stUnp = '-';
  endUnp = '-';
  stPdb = '-';
  endPdb = '-';
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
  actualUniprot;
  alert = 'Click on a pdb to start';
  error = '';
  disStartPdb= true;
  disEndPdb= true;
  disStartUnp= true;
  disEndUnp= true;
  stv: Clicked;
  sqv: Clicked;
  uniqUnit = [];
  uniqIns = [];

  ngOnInit(): void {
    this.sqv = { chains: [], units: [], insertions: [], user: []};
    this.stv = { chains: [], units: [], insertions: [], user: []};
    this.featureList = [];
    this.arrEntryStv = [];
    this.updateView(this.uniprotId.toUpperCase());
  }

  public updateView(id) {
    this.uniprotId = id;
    this.actualUniprot = id;

    this.dataFetcher.getData(this.uniprotId).then((data: DataFetcher) => {

      if (!data) {
        return;
      }

      document.getElementById('fv').innerHTML = '';
      this.data = data;

      // create json data to download
      this.fileJson = this.dataDownload.getJson(data, this.uniprotId);

      // new Feature Viewer
      this.currentUniprot = data.uniprots[this.uniprotId];
      delete this.featureViewer;
      this.featureViewer = new FeatureViewer(this.currentUniprot.sequence, '#fv', FtModel.fvOptions);

      // fill Feature Viewer
      const featureList = [];
      featureList.push(FtModel.buildUnpFt(this.uniprotId, this.currentUniprot.sequence.length));

      let chFeature;
      let pdbInfo: PdbInfo;
      let chainInfo: ChainInfo;
      // tslint:disable-next-line:forin
      for (const pdb in this.currentUniprot.pdbs) {
        pdbInfo = data.pdbs[pdb];
        for (const chain of this.currentUniprot.pdbs[pdb].sort()) {
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
      document.getElementsByClassName('loader')[0].className = '';
      document.getElementsByClassName('loaderMsg')[0].innerHTML = '';
      this.featureViewer.onRegionSelected(r => this.updateTools(r));
      this.featureViewer.onButtonSelected(r => this.paint(r));


      this.input = {
        rows: {
          1: {data: this.currentUniprot.sequence}
        },
        colors: {},
        parameters: {
          chunkSize: '5',
          spaceSize: '1',
          log: 'debug'
        }
      };
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
        sq += this.currentUniprot.sequence[i];
      }
      multifasta += '>' + this.feature.toUpperCase() + ' ' + e.x + '-' + e.y + '\n' + sq + '\n';
    }
    this.multifasta = this.dataDownload.getMultifasta(multifasta);
  }

  paint(event) {
    console.log(event)
    if (event.detail.id.includes('drop')){
      this.tint(event);
      return;
    }

    let pdb;
    let ch;
    let cl;
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
      switch(event.detail.id) {
        case 'c-paint-custom-unit': {
          // TODO sostituire xy con uniqUnit
          for (const item of xy) {
            this.updateSqv(item.x, item.y, 'usr', item.color);
            cl = RepKbClModel.hexToRgb(item.color);
            this.updateStv(item.x, item.y, pdb, ch, 'usr', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
          }
          break;
        }
        case 'c-paint-custom-ins': {

          for (const item of xy) {
            this.updateSqv(item.x, item.y, 'usr', item.color);
            cl = RepKbClModel.hexToRgb(item.color);
            this.updateStv(item.x, item.y, pdb, ch, 'usr', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
          }
          break;
        }

      }




    } else {
      const name = event.detail.id.substring(2);
      [pdb, ch] = name.split('-');
      if (event.detail.id[0] === 'u' ) {
        const xy = JSON.parse(event.detail.dataxy);
        for (const unit of xy) {
          this.updateSqv(unit.x, unit.y, 'uni', unit.color);
          cl = RepKbClModel.hexToRgb(unit.color);
          this.updateStv(unit.x, unit.y, pdb, ch, 'uni', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
        }
      } else if (event.detail.id[0] === 'i') {
        const xy = JSON.parse(event.detail.dataxy);
        for (const ins of xy) {
          cl = RepKbClModel.hexToRgb(ins.color);
          this.updateSqv(ins.x, ins.y, 'ins', ins.color);
          this.updateStv(ins.x, ins.y, pdb, ch, 'ins', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
        }
      }
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
          case 'drop-One': {
            this.featureList[0].data[i].color = FtModel.colorsHex.cOne;
            break;
          }
          case 'drop-Two': {
            this.featureList[0].data[i].color = FtModel.colorsHex.cTwo;
            break;
          }
          case 'drop-Three': {
            this.featureList[0].data[i].color = FtModel.colorsHex.custom;
            break;
          }
        }

      }
    }
    document.getElementById('fv').innerHTML = '';
    this.featureViewer = new FeatureViewer(this.currentUniprot.sequence, '#fv', FtModel.fvOptions);
    this.featureViewer.addFeatures(this.featureList);
    this.featureViewer.onRegionSelected(r => this.updateTools(r));
    this.featureViewer.onButtonSelected(r => this.paint(r));
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.stv.user.length; i++) {
      if (this.stv.user[i].start_residue_number === this.lastSelectCustom.x
        &&  this.stv.user[i].end_residue_number === this.lastSelectCustom.y) {
        switch(event.detail.id) {
          case 'drop-One': {
            this.stv.user[i].color = RepKbClModel.hexToRgb(FtModel.colorsHex.cOne);
            break;
          }
          case 'drop-Two': {
            this.stv.user[i].color = RepKbClModel.hexToRgb(FtModel.colorsHex.cTwo);
            break;
          }
          case 'drop-Three': {
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
          case 'drop-One': {
            this.sqv.user[i].cl = FtModel.colorsHex.cOne;
            break;
          }
          case 'drop-Two': {
            this.sqv.user[i].cl = FtModel.colorsHex.cTwo;
            break;
          }
          case 'drop-Three': {
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
        x: +this.stUnp, y: +this.endUnp, color: FtModel.colorsHex.custom, feature: this.feature});
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
      this.error = 'Invalid action. Please select a feature.'
      return;
    }

    if (this.disStartPdb === null && (this.stUnp === '-' || this.endUnp === '-')) {
      this.error = e;
      return;
    } else if (this.disStartUnp === null && (this.startUsrUnp === undefined || this.endUsrUnp === undefined)) {
      this.error = e;
      return;
    }

    if (this.disStartPdb) {
      this.stUnp = this.startUsrUnp;
      this.endUnp = this.endUsrUnp;
    }

    if (this.stUnp === '-' || this.endUnp === '-' || +this.stUnp > +this.endUnp) {
      this.error = e;
      return;
    } else if (+this.stUnp === +this.endUnp) {
      this.error = 'Feature is too short to be showed.';
      return;
    }

    let ftUnit;
    let ftIns;
    switch(this.feature) {
      case 'unit': {
        FtModel.idCustomUnit += 1;
        // TODO identify first row
        // let flag = true;
        // if (this.uniqUnit.length === 0) {
        //   this.uniqUnit.push( {x:this.stUnp, y:this.endUnp} );
        // } else {
        //   for (const uniq of this.uniqUnit) {
        //     if ((this.stUnp < uniq.x && this.endUnp < uniq.x) || (this.stUnp > uniq.y && this.endUnp > uniq.y)) {
        //     } else {
        //       flag = false;
        //       break;
        //     }
        //   }
        //   if (flag) {
        //     this.uniqUnit.push( {x:this.stUnp, y:this.endUnp} );
        //   }
        // }
        ftUnit = FtModel.buildCus(this.stUnp, this.endUnp, this.currentUniprot.sequence.length,
          this.actualPdb, FtModel.custom.idUnit, FtModel.idCustomUnit);
        this.addCusEntity(ftUnit, FtModel.custom.idUnit);
        break;
      }
      case 'insertion': {
        FtModel.idCustomIns += 1;
        ftIns = FtModel.buildCus(this.stUnp, this.endUnp, this.currentUniprot.sequence.length,
          this.actualPdb, FtModel.custom.idIns, FtModel.idCustomIns);
        this.addCusEntity(ftIns, FtModel.custom.idIns);
        break;
      }
    }

    this.featureViewer.emptyFeatures();
    this.featureViewer.addFeatures(this.featureList);
    if (ftUnit && ftUnit.data.length > 0) {
      this.featureViewer.highlightRegion({x: ftUnit.data[ftUnit.data.length - 1].x,
        y: ftUnit.data[ftUnit.data.length - 1].y}, ftUnit.id);
    }
    if (ftIns && ftIns.data.length > 0) {
      this.featureViewer.highlightRegion({x: ftIns.data[ftIns.data.length - 1].x,
        y: ftIns.data[ftIns.data.length - 1].y}, ftIns.id);
    }
    this.generateMultifasta();
  }

  removeCustom(type: string) {

    if (this.featureList.length <= 0) {
      Log.w(1, 'nothing to draw on.');
      return;
    }

    if (type === 'selected') {

      for (let i = 0; i < this.multicustom.length; i++) {
        if (this.multicustom[i].id === this.lastSelectCustom.id) {
          this.multicustom.splice(i, 1);
        }
      }

      switch (this.lastSelectCustom.feature) {
        case 'custom-unit':{
          this.removeSelected(this.lastSelectCustom, FtModel.custom.idUnit);
          break;
        }
        case 'custom-insertion':{
          this.removeSelected(this.lastSelectCustom, FtModel.custom.idIns);
          break;
        }
      }
    } else if (type === 'last') {
      const last = this.multicustom.pop();
      if(!last) {
        return;
      }
      switch (last.feature) {
        case 'unit':{
          this.removeSelected(last, FtModel.custom.idUnit);
          break;
        }
        case 'insertion':{
          this.removeSelected(last, FtModel.custom.idIns);
          break;
        }
      }
    } else {
      this.multicustom = [];
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
    this.featureViewer.emptyFeatures();
    this.featureViewer.addFeatures(this.featureList);
    this.generateMultifasta();
  }

  removeSelected(element, check) {
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
    this.stvComp.deleteColor(this.arrEntryStv, this.stv);
    this.updateInput();
  }

  // real time user values conversion
  ngAfterViewChecked(): void {

    if (this.event !== undefined && this.actualUniprot !== this.event.toString()) {
      this.updateView(this.event);
    }


    // PDB TO UNIPROT
    if (this.pdb !== undefined && this.data.pdbs[this.pdb] !== undefined) {

      this.alert = '';
      this.disStartPdb = null;
      this.disEndPdb = null;
      this.disStartUnp = null;
      this.disEndUnp = null;

      if(this.startUsrPdb || this.endUsrPdb) {
        this.disStartUnp = true;
        this.disEndUnp = true;
      } else if (this.startUsrUnp || this.endUsrUnp) {
        this.disStartPdb = true;
        this.disEndPdb = true;
      }

      const toUnp = this.data.pdbs[this.pdb].chains[this.chain].aut_to_unp;

      if (this.startUsrPdb in toUnp) {
        this.stUnp = toUnp[this.startUsrPdb];
        if (this.stUnp[0] === 'u') {
          this.stUnp = ' - ';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.stUnp =  '-';
        this.cdRef.detectChanges();
      }
      if (this.endUsrPdb in toUnp) {
        this.endUnp = toUnp[this.endUsrPdb];
        if (this.endUnp[0] === 'u') {
          this.endUnp =  '-';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.endUnp =  '-';
        this.cdRef.detectChanges();
      }
    } else {
      // no user input
      this.stUnp =  '-';
      this.endUnp =  '-';
    }

    // UNIPROT TO PDB
    if (this.pdb !== undefined && this.data.pdbs[this.pdb] !== undefined) {
      const toPdb = this.data.pdbs[this.pdb].chains[this.chain].unp_to_aut;


      if (this.startUsrUnp in toPdb) {
        this.stPdb = toPdb[this.startUsrUnp];
        if (this.stPdb[0] === 'u') {
          this.stPdb =  '-';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.stPdb =  '-';
        this.cdRef.detectChanges();
      }
      if (this.endUsrUnp in toPdb) {
        this.endPdb = toPdb[this.endUsrUnp];
        if (this.endPdb[0] === 'u') {
          this.endPdb =  '-';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.endPdb =  '-';
        this.cdRef.detectChanges();
      }
    } else {
      // no user input
      this.stPdb =  '-';
      this.endPdb =  '-';
    }
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
      identity = 'uni';
    } else if (label[0] === 'i') {
      label = label.substring(2);
      identity = 'ins'; // yellow

    } else if (label[0] === 'c') {
      label = label.substring(2);
      identity = 'usr'; // green

    } else {
      identity = 'ch';
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
    if (identity === 'usr') {
      // tslint:disable-next-line:forin
      for (const chain in this.data.pdbs[pdb].chains) {
        let stAut;
        let endAut;

        // coloring structure viewer
        for (let i = st; i <= end; i ++) {
          if (i in chains[chain].unp_to_aut) {
            stAut = chains[chain].unp_to_aut[i];
            break;
          } else {
            this.error = 'this feature is not fully visible on the selected pdb structure';
          }
        }
        for (let i = end; i >= st; i --) {
          if (end in chains[chain].unp_to_aut) {
            endAut = chains[chain].unp_to_aut[i];
            break;
          } else {
            this.error = 'this feature is not fully visible on the selected pdb structure';
          }
        }

        if (stAut !== undefined && endAut !== undefined) {
          const stvInfo = RepKbClModel.createStvInfo(rgb, chains, chain, stAut, endAut);
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
    this.feature = event.target.value;
  }

  selectChangeHandler(event: any) {
    const selected = event.target.value;

    if (selected === 'clustal') {
      this.input = {
        rows: {
          1: {data: this.currentUniprot.sequence}
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
        1: {data: this.currentUniprot.sequence}
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
