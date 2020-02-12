import {AfterViewChecked, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {FeatureViewer} from 'feature-viewer-typescript/lib';
import {DomSanitizer} from '@angular/platform-browser';
import {ChainInfo, DataFetcher, PdbInfo, PdbsDict, UniprotInfo} from '../interfaces/dataFetcher.interface';
import {DataFetcherModel} from '../models/dataFetcher/dataFetcher.model';
import {DataDownloadModel} from '../models/dataDownload/dataDownload.model';
import {StrucViewComponent} from '../structureViewer/struc-view.component';
import {FeatureViewerModel} from '../models/featureViewer/featureViewer.model';
import {Log} from '../models/log.model';
import {pluck, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ActivatedRoute} from '@angular/router';


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
    this.featureList = [];
    this.dataFetcher = new DataFetcherModel();
    this.dataDownload = new DataDownloadModel(san);
    this.arrEntry = [];
    this.clicked = {
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
    flagColor: '#DFD5F5', showSubFeatures: true, backgroundcolor: 'transparent'
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
  startUsrPdb;
  endUsrPdb;
  startUsrUnp;
  endUsrUnp;
  stUnp = 'n/a';
  endUnp = 'n/a';
  stPdb = 'n/a';
  endPdb = 'n/a';
  data;
  pdb;
  chain;
  lastClicked;
  input;
  colorations = ['Choose palette', 'clustal']; // add colorations here
  arrEntry;
  clicked;
  arrEntrySqv;
  clickedSqv;
  actualPdb;
  actualUniprot;
  countCustom = 0;

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
      featureList.push(FeatureViewerModel.buildUnpFt(this.uniprotId, this.currentUniprot.sequence.length));

      let chFeature;
      let pdbInfo: PdbInfo;
      let chainInfo: ChainInfo;
      // tslint:disable-next-line:forin
      for (const pdb in this.currentUniprot.pdbs) {
        pdbInfo = data.pdbs[pdb];
        for (const chain of this.currentUniprot.pdbs[pdb].sort()) {
          chainInfo = pdbInfo.chains[chain];
          chFeature = FeatureViewerModel.buildChFt(pdb, chainInfo);
          let subFt;
          let tooltip;
          [subFt, tooltip] = FeatureViewerModel.buildRegFt(pdb, chainInfo);

          if (tooltip) {

            chFeature.sidebar[0].content = `<a target="_blank">
                                            <i data-id="ch"
                                              data-pdb="${pdb}-${chainInfo.chain_id}"
                                              data-x = "${chainInfo.unp_start}"
                                              data-y = "${chainInfo.unp_end}"
                                              class="fa fa-paint-brush aria-hidden="true"></i></a>
                                            <a target="_blank" href="${FeatureViewerModel.pdbUrl}${pdb}${chain}">`;
            chFeature.sidebar.push({
              id: 'MyHtml',
              tooltip: `RpsDb ${pdb}-${chain}`,
              content: `<a target="_blank" href="${FeatureViewerModel.pdbUrl}${pdb}${chain}">
                    <i style="margin-top: 6px" class="fa fa-external-link" aria-hidden="true"></i></a>` // RepeatsDb
            });
            chFeature.sidebar[2].tooltip = pdb + chain + ' | RpsDb additional info';

          }
          if (subFt.length > 0) {
            [chFeature.subfeatures, tooltip] = FeatureViewerModel.buildRegFt(pdb, chainInfo);
          }
          featureList.push(chFeature);
        }
      }

      this.featureList = featureList;
      this.featureViewer.addFeatures(featureList);
      document.getElementsByClassName('loader')[0].className = '';
      document.getElementsByClassName('loaderMsg')[0].className = '';
      this.featureViewer.onRegionSelected(r => this.updateTools(r));
      document.querySelectorAll('.fa-paint-brush')
        .forEach(item =>  item.addEventListener('click', () => this.paint(event)));

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
    let multifasta = '';
    for (const e of this.multicustom) {
      let sq = '';
      for (let i = e.x - 1; i <= e.y - 1; i++) {
        sq += this.currentUniprot.sequence[i];
      }
      multifasta += 'UNIT    ' + e.x + '-' + e.y + '    ' + sq + '\n';
    }
    this.multifasta = this.dataDownload.getMultifasta(multifasta);
  }

  paint(event) {
    let pdb;
    let ch;
    let cl;
    this.clicked.user = [];
    this.clickedSqv.user = [];
    this.eraseAll();
    if (event.target.dataset.id === 'usr') {
      const xy = JSON.parse(event.target.dataset.dt); // TODO i need data

      for (const item of xy) {
        ch = item.pdb[item.pdb.length - 1];
        pdb = item.pdb.slice(0, -1);

        this.updateSqv(item.x, item.y, item.color, 'usr');
        cl = this.hexToRgb(item.color);
        this.updateStv(item.x, item.y, pdb, ch, 'usr', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
      }
    } else {
      const name = event.target.dataset.pdb.substring(2);
      [pdb, ch] = name.split('-');
      if (event.target.dataset.pdb[0] === 'u' ) {
        const xy = JSON.parse(event.target.dataset.xy);
        for (const unit of xy) {
          this.updateSqv(unit.x, unit.y, unit.color, 'uni');
          cl = this.hexToRgb(unit.color);
          this.updateStv(unit.x, unit.y, pdb, ch, 'uni', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
        }
      } else if (event.target.dataset.pdb[0] === 'i') {
        const xy = JSON.parse(event.target.dataset.xy);
        for (const ins of xy) {
          cl = this.hexToRgb(ins.color);
          this.updateSqv(ins.x, ins.y, ins.color, 'ins');
          this.updateStv(ins.x, ins.y, pdb, ch, 'ins', {r: cl.r, g: cl.g, b: cl.b}, xy.length);
        }
      }
    }
  }

  drawCustom() {

    if (this.featureList.length <= 0) {
      Log.w(1, 'nothing to draw on.');
      return;
    }

    if (!this.stUnp || !this.endUnp) {
      Log.w(1, 'impossible to find user inputs.');
      return;
    }

    if (this.stUnp !== 'n/a' || this.endUnp !== 'n/a') {
      this.countCustom += 1;
    }

    const feature = FeatureViewerModel.buildCusFt(this.stUnp, this.endUnp, this.currentUniprot.sequence.length, this.actualPdb);

    if (feature) {
      if (this.featureList[0].label === 'custom') {
        this.featureList[0].data.push(feature.data[0]);
      } else {
        this.featureList.unshift(feature);
      }

      this.featureViewer.emptyFeatures();
      this.featureViewer.addFeatures(this.featureList);
      if (feature.data.length > 0) {
        this.featureViewer.highlightRegion({x: feature.data[feature.data.length - 1].x,
          y: feature.data[feature.data.length - 1].y}, feature.id);
      }
      this.multicustom.push({pdb: this.actualPdb, x: this.stUnp, y: this.endUnp, color: FeatureViewerModel.colorsHex.custom});
      this.generateMultifasta();
    }

    const dt = JSON.stringify(this.multicustom);
    console.log(document.getElementById('usr'));
    if (this.countCustom > 1) {
      document.getElementById('usr').innerHTML = `<a id='usr'><i data-id='usr' data-dt = '${dt}' class='fa fa-paint-brush'
       aria-hidden='true'></i></a>`;
    }

    document.querySelectorAll('.fa-paint-brush')
      .forEach(item =>  item.addEventListener('click', () => this.paint(event)));

  }

  removeCustom(type: string) {

    if (this.featureList.length <= 0) {
      Log.w(1, 'nothing to draw on.');
      return;
    }

    if (this.featureList[0].label !== 'custom') {
      Log.w(2, 'no custom entities to remove.');
      return;
    }

    if (type === 'last') {
      this.countCustom -= 1;
      this.multicustom.pop();

      this.featureList[0].data.pop();
      this.clicked.user.pop();
      this.stvComp.deleteColor(this.arrEntry, this.clicked);

      this.clickedSqv.user.pop();
      this.updateInput();

    } else {
      this.countCustom = 0;
      this.multicustom = [];

      this.clicked.user = [];
      this.stvComp.deleteColor(this.arrEntry, this.clicked);

      this.clickedSqv.user = [];
      this.updateInput();
      this.featureList.shift();
    }
    this.featureViewer.emptyFeatures();
    this.featureViewer.addFeatures(this.featureList);
    this.generateMultifasta();

    if (this.countCustom > 1) {
      const dt = JSON.stringify(this.multicustom);
      document.getElementById('usr').innerHTML = `<a id='usr'><i data-id='usr' data-dt = '${dt}' class='fa fa-paint-brush'
       aria-hidden='true'></i></a>`;
    }
  }

  // real time user values conversion
  ngAfterViewChecked(): void {

    if (this.event !== undefined && this.actualUniprot !== this.event.toString()) {
      this.updateView(this.event);
    }

    //PDB TO UNIPROT
    if (this.pdb !== undefined && this.data.pdbs[this.pdb] !== undefined) {
      const toUnp = this.data.pdbs[this.pdb].chains[this.chain].aut_to_unp;


      if (this.startUsrPdb in toUnp) {
        this.stUnp = toUnp[this.startUsrPdb];
        if (this.stUnp[0] === 'u') {
          this.stUnp = 'n/a';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.stUnp = 'n/a';
        this.cdRef.detectChanges();
      }
      if (this.endUsrPdb in toUnp) {
        this.endUnp = toUnp[this.endUsrPdb];
        if (this.endUnp[0] === 'u') {
          this.endUnp = 'n/a';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.endUnp = 'n/a';
        this.cdRef.detectChanges();
      }
    } else {
      // no user input
      this.stUnp = 'n/a';
      this.endUnp = 'n/a';
    }

    // UNIPROT TO PDB
    if (this.pdb !== undefined && this.data.pdbs[this.pdb] !== undefined) {
      const toPdb = this.data.pdbs[this.pdb].chains[this.chain].unp_to_aut;


      if (this.startUsrUnp in toPdb) {
        this.stPdb = toPdb[this.startUsrUnp];
        if (this.stPdb[0] === 'u') {
          this.stPdb = 'n/a';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.stPdb = 'n/a';
        this.cdRef.detectChanges();
      }
      if (this.endUsrUnp in toPdb) {
        this.endPdb = toPdb[this.endUsrUnp];
        if (this.endPdb[0] === 'u') {
          this.endPdb = 'n/a';
        }
        this.cdRef.detectChanges();
      } else {
        // user input outside convObj
        this.endPdb = 'n/a';
        this.cdRef.detectChanges();
      }
    } else {
      // no user input
      this.stPdb = 'n/a';
      this.endPdb = 'n/a';
    }
  }

  updateTools(r) {
    // preprocess input
    const st = r.detail.selectedRegion.x;
    const end = r.detail.selectedRegion.y;
    const clickedColorHex = r.detail.selectedRegion.color;
    const clickedColorRgb = this.hexToRgb(clickedColorHex);

    let ch;
    let pdb;
    let label;
    let identity;
    let rgb;
    const xy = -1; // TODO change this
    // if custom label, take name of last clicked pdb
    if (r.detail.label === 'custom') {
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
    if (this.actualPdb !== undefined && this.actualPdb !== clickedPdb) {
        this.emptyArr();
    }

    this.updateStv(st, end, pdb, ch, identity, rgb, xy);
    this.updateSqv(st, end, clickedColorHex, identity);
    this.actualPdb = clickedPdb;
  }

  updateStv(st, end, pdb, ch, identity, rgb, xy) {
    if (identity === 'usr') {

      // tslint:disable-next-line:forin
      for (const chain in this.data.pdbs[pdb].chains) {
        // coloring structure viewer

        // TODO to test this conversion: need and example with a pdb with chains of different length (overlapping but not completely)
        // you can run a script to see if you find them
        let stAut;
        let endAut;
        for (let i = st; st <= end; i ++) {
          if (i in this.data.pdbs[pdb].chains[chain].unp_to_aut) {
            stAut = st - this.data.pdbs[pdb].chains[ch].shift;
            break;
          }
        }
        for (let i = end; end >= st; i --) {
          if (end in this.data.pdbs[pdb].chains[chain].unp_to_aut) {
            endAut = end - this.data.pdbs[pdb].chains[ch].shift;
            break;
          }
        }

        if (stAut !== undefined && endAut !== undefined) {
          this.arrEntry = this.stvComp.updateView(xy, this.arrEntry, this.clicked,
            pdb.toLowerCase(),
            ch,
            identity, // region or units/insertions
            {
              entity_id: this.data.pdbs[pdb].chains[chain].entity_id.toString(),
              struct_asym_id: chain,
              start_residue_number: stAut,
              end_residue_number: endAut,
              color: rgb
            });
        }
      }
    } else {
      // coloring structure viewer
      // convert from uniprot values to pdb
      st = st - this.data.pdbs[pdb].chains[ch].shift;
      end = end - this.data.pdbs[pdb].chains[ch].shift;
      this.arrEntry = this.stvComp.updateView(xy, this.arrEntry, this.clicked,
        pdb.toLowerCase(),
        ch,
        identity, // region or units/insertions
        {
          entity_id: this.data.pdbs[pdb].chains[ch].entity_id.toString(),
          struct_asym_id: ch,
          start_residue_number: st,
          end_residue_number: end,
          color: rgb
        });
    }
  }

  updateSqv(st, end, cl, identity) {
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
    this.clicked.chains  = [];
    this.clicked.units = [];
    this.clicked.insertions = [];
    this.arrEntrySqv = [];
    this.clickedSqv.chains  = [];
    this.clickedSqv.units = [];
    this.clickedSqv.insertions = [];
  }

  eraseAll() {
    this.emptyArr();
    this.updateInput();
    this.stvComp.deleteColor(this.arrEntry, this.clicked);
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