import {AfterViewChecked, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {FeatureViewer} from 'feature-viewer-typescript/lib';
import {DomSanitizer} from '@angular/platform-browser';
import {ChainInfo, DataFetcher, PdbInfo, PdbsDict, UniprotInfo} from '../interfaces/dataFetcher.interface';
import {DataFetcherModel} from '../models/dataFetcher/dataFetcher.model';
import {DataDownloadModel} from '../models/dataDownload/dataDownload.model';
import {StrucViewComponent} from '../structureViewer/struc-view.component';
import {FtModel} from '../models/featureViewer/featureViewer.model';
import {Log} from '../models/log.model';
import {pluck, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {lifecycleHookToNodeFlag} from '@angular/compiler/src/view_compiler/provider_compiler';


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
              private stvComp: StrucViewComponent,
              private formBuilder: FormBuilder) {
    const destroyed = new Subject<any>();
    this.route.params
      .pipe(takeUntil(destroyed), pluck('id'))
      .subscribe(id => this.uniprotId = id);
    this.featureList = [];
    this.dataFetcher = new DataFetcherModel();
    this.dataDownload = new DataDownloadModel(san);
    this.arrEntry = [];
    this.clickedStv = {
      chains: [],
      units: [],
      insertions: [],
      user: []
    };

    this.clickedSqv = {
      chains: [],
      units: [],
      insertions: [],
      user: []
    };
  }

  static fvOptions = {
    showAxis: true, showSequence: true, toolbar: true,
    toolbarPosition: 'left', zoomMax: 10, sideBar: 200,
    flagColor: '#DFD5F5', showSubFeatures: true, backgroundcolor: 'white',
    flagTrack: 150,
    flagTrackMobile: 150
  };

  @Input() event: Event;
  uniprotId: string;
  currentUniprot: UniprotInfo;
  featureList: Array<any>;
  dataFetcher: DataFetcherModel;
  featureViewer: FeatureViewer;
  dataDownload: DataDownloadModel;
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
  arrEntry;
  clickedStv;
  arrEntrySqv;
  clickedSqv;
  actualPdb;
  actualUniprot;
  alert = 'Click on a pdb to start';
  error = '';
  disStartPdb= true;
  disEndPdb= true;
  disStartUnp= true;
  disEndUnp= true;

  ngOnInit(): void {
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
      this.featureViewer = new FeatureViewer(this.currentUniprot.sequence, '#fv', RepKBComponent.fvOptions);

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
    if (event.detail.id.includes('drop')){
      this.tint(event);
      return;
    }

    let pdb;
    let ch;
    let cl;
    this.clickedStv.user = [];
    this.clickedSqv.user = [];
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
      for (const item of xy) {


        this.updateSqv(item.x, item.y, item.color, 'usr');
        cl = this.hexToRgb(item.color);
        this.updateStv(item.x, item.y, pdb, ch, 'usr', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
      }
    } else {
      const name = event.detail.id.substring(2);
      [pdb, ch] = name.split('-');
      if (event.detail.id[0] === 'u' ) {
        const xy = JSON.parse(event.detail.dataxy);
        for (const unit of xy) {
          this.updateSqv(unit.x, unit.y, unit.color, 'uni');
          cl = this.hexToRgb(unit.color);
          this.updateStv(unit.x, unit.y, pdb, ch, 'uni', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
        }
      } else if (event.detail.id[0] === 'i') {
        const xy = JSON.parse(event.detail.dataxy);
        for (const ins of xy) {
          cl = this.hexToRgb(ins.color);
          this.updateSqv(ins.x, ins.y, ins.color, 'ins');
          this.updateStv(ins.x, ins.y, pdb, ch, 'ins', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
        }
      }
    }
  }

  // change colors of selected custom features
  tint(event) {

    if (this.clickedStv.user.length <= 0) {
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
    this.featureViewer = new FeatureViewer(this.currentUniprot.sequence, '#fv', RepKBComponent.fvOptions);
    this.featureViewer.addFeatures(this.featureList);
    this.featureViewer.onRegionSelected(r => this.updateTools(r));
    this.featureViewer.onButtonSelected(r => this.paint(r));
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.clickedStv.user.length; i++) {
      if (this.clickedStv.user[i].start_residue_number === this.lastSelectCustom.x
        &&  this.clickedStv.user[i].end_residue_number === this.lastSelectCustom.y) {
        switch(event.detail.id) {
          case 'drop-One': {
            this.clickedStv.user[i].color = this.hexToRgb(FtModel.colorsHex.cOne);
            break;
          }
          case 'drop-Two': {
            this.clickedStv.user[i].color = this.hexToRgb(FtModel.colorsHex.cTwo);
            break;
          }
          case 'drop-Three': {
            this.clickedStv.user[i].color = this.hexToRgb(FtModel.colorsHex.custom);
            break;
          }
        }

      }
    }
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.clickedSqv.user.length; i++) {
      const reg = this.lastSelectCustom.x + '-' + this.lastSelectCustom.y;
      if (this.clickedSqv.user[i].reg === reg) {
        switch(event.detail.id) {
          case 'drop-One': {
            this.clickedSqv.user[i].cl = FtModel.colorsHex.cOne;
            break;
          }
          case 'drop-Two': {
            this.clickedSqv.user[i].cl = FtModel.colorsHex.cTwo;
            break;
          }
          case 'drop-Three': {
            this.clickedSqv.user[i].cl = FtModel.colorsHex.custom;
            break;
          }
        }
      }
    }
    this.stvComp.deleteColor(this.arrEntry, this.clickedStv);
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
        ftUnit = FtModel.buildCus(this.stUnp, this.endUnp, this.currentUniprot.sequence.length,
          this.actualPdb, FtModel.custom.idUnit, FtModel.idCustomUnit);
        this.addCusEntity(ftUnit, FtModel.custom.idUnit);
        break;
      }
      case 'insertion': {
        ftIns = FtModel.buildCus(this.stUnp, this.endUnp, this.currentUniprot.sequence.length,
          this.actualPdb, FtModel.custom.idIns, FtModel.idCustomInsertion);
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

    const dt = JSON.stringify(this.multicustom);
    // if (this.multicustom.length > 1) {
    //   document.getElementById('usr').innerHTML =
    //                   `<a id='usr'>
    //                     <i data-id='usr' data-dt = '${dt}' class='fa fa-paint-brush'></i>
    //                    </a>`;
    // }
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
      this.clickedStv.user = [];
      this.stvComp.deleteColor(this.arrEntry, this.clickedStv);
      this.clickedSqv.user = [];
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

    // if (this.multicustom.length > 1) {
    //   const dt = JSON.stringify(this.multicustom);
    //   document.getElementById('usr').innerHTML = `<a id='usr'><i data-id='usr' data-dt = '${dt}' class='fa fa-paint-brush'
    //    aria-hidden='true'></i></a>`;
    // }
  }

  removeSelected(element, check) {
    let flag = false;
    for (const ft in this.featureList) {
      if (this.featureList[ft].id === check) {
        flag = true;
        for (let i = 0; i < this.featureList[ft].data.length; i++) {
          if (this.featureList[ft].data[i].label === element.id) {
            this.featureList[ft].data.splice(i, 1);
            if (this.featureList[ft].data.length === 0) {
              this.featureList.splice(i, 1)
            }
            break;
          }
        }
      }
    }
    console.log(element)
    // const toUnp = this.data.pdbs[this.pdb].chains[this.chain].unp_to_aut;

    console.log(this.clickedStv.user)
    for (let i = 0; i < this.clickedStv.user.length; i++) {
      if (this.clickedStv.user[i].start_residue_number === element.x
        &&  this.clickedStv.user[i].end_residue_number === element.y) {
        this.clickedStv.user.splice(i, 1);
        console.log(i);
        i--;
      }
    }

    for (let i = 0; i < this.clickedSqv.user.length; i++) {
      const reg = element.x + '-' + element.y;
      if (this.clickedSqv.user[i].reg === reg) {
        this.clickedSqv.user.splice(i, 1);
        i--;
      }
    }
    this.stvComp.deleteColor(this.arrEntry, this.clickedStv);
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
    const clickedColorRgb = this.hexToRgb(clickedColorHex);

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
        this.emptyArr();
      } else if (this.actualPdb !== clickedPdb){
        this.arrEntry = [];
        this.clickedStv.chains  = [];
        this.clickedStv.units = [];
        this.clickedStv.insertions = [];

        this.arrEntrySqv = [];
        this.clickedSqv.chains  = [];
        this.clickedSqv.units = [];
        this.clickedSqv.insertions = [];
      }
    }
    this.updateStv(x, y, pdb, ch, identity, rgb, xy);
    this.updateSqv(x, y, identity, clickedColorHex);
    this.actualPdb = clickedPdb;
  }

  updateStv(st, end, pdb, ch, identity, rgb, xy) {

    if (identity === 'usr') {
      // tslint:disable-next-line:forin
      for (const chain in this.data.pdbs[pdb].chains) {
        // coloring structure viewer
        // TODO to test this conversion: need and example with a pdb with chains of different length (overlapping but not completely)
        // you can run a script to see if you find them
        let stUnp;
        let endUnp;
        for (let i = st; st <= end; i ++) {
          if (i in this.data.pdbs[pdb].chains[chain].aut_to_unp) {
            stUnp = this.data.pdbs[pdb].chains[chain].aut_to_unp[i];
            break;
          } else {
            return;
          }
        }
        for (let i = end; end >= st; i --) {
          if (end in this.data.pdbs[pdb].chains[chain].aut_to_unp) {
            endUnp = this.data.pdbs[pdb].chains[chain].aut_to_unp[i];
            break;
          } else {
            return;
          }
        }
        if (stUnp !== undefined && endUnp !== undefined) {
          this.arrEntry = this.stvComp.updateView(xy, this.arrEntry, this.clickedStv,
            pdb.toLowerCase(),
            ch,
            identity, // region or units/insertions
            {
              entity_id: this.data.pdbs[pdb].chains[chain].entity_id.toString(),
              struct_asym_id: this.data.pdbs[pdb].chains[chain].struct_asym_id,
              start_residue_number: stUnp,
              end_residue_number: endUnp,
              color: rgb
            });
        }
      }
    } else {
      // coloring structure viewer
      // convert from uniprot values to pdb

      st = st - this.data.pdbs[pdb].chains[ch].shift;
      end = end - this.data.pdbs[pdb].chains[ch].shift;
      this.arrEntry = this.stvComp.updateView(xy, this.arrEntry, this.clickedStv,
        pdb.toLowerCase(),
        ch,
        identity, // region or units/insertions
        {
          entity_id: this.data.pdbs[pdb].chains[ch].entity_id.toString(),
          struct_asym_id: this.data.pdbs[pdb].chains[ch].struct_asym_id,
          start_residue_number: st,
          end_residue_number: end,
          color: rgb
        });
    }
  }

  updateSqv(st, end, identity, cl) {
    const reg = st + '-' + end;
    const obj = {reg, cl};

    if (identity === 'ch') {
      this.insertClickElem(obj, this.clickedSqv.chains);
    } else if (identity === 'uni') {
      this.insertClickElem(obj, this.clickedSqv.units);
    } else if (identity === 'ins') {
      this.insertClickElem(obj, this.clickedSqv.insertions);
    } else if (identity === 'usr') {
      this.insertClickElem(obj, this.clickedSqv.user);
    }

    this.updateInput();
  }

  insertClickElem(obj, arr) {

    let elem;
    let flag = true;
    for (let i = 0; i < arr.length; i++) {
      elem = arr[i];
      if ((obj.reg !==  elem.reg) && (obj.color !==  elem.reg)) {
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
    this.arrEntrySqv = [];
    Array.prototype.push.apply(this.arrEntrySqv, this.clickedSqv.chains);
    Array.prototype.push.apply(this.arrEntrySqv, this.clickedSqv.units);
    Array.prototype.push.apply(this.arrEntrySqv, this.clickedSqv.insertions);
    Array.prototype.push.apply(this.arrEntrySqv, this.clickedSqv.user);

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

  emptyArr() {
    this.arrEntry = [];
    this.clickedStv.chains  = [];
    this.clickedStv.units = [];
    this.clickedStv.user = [];
    this.clickedStv.insertions = [];

    this.arrEntrySqv = [];
    this.clickedSqv.chains  = [];
    this.clickedSqv.units = [];
    this.clickedSqv.insertions = [];
    this.clickedSqv.user = [];
  }

  eraseAll() {
    this.emptyArr();
    this.stvComp.deleteColor(this.arrEntry, this.clickedStv);
    this.updateInput();
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

}
