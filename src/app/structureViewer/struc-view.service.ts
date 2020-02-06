import { Injectable } from '@angular/core';
import LiteMol from 'litemol';
import {applyTheme, ColorDefinition, createTheme} from './customTheme';
import {process} from './App';

@Injectable({
  providedIn: 'root'
})

export class StrucViewService {

  // this url generate error
  urlLiteMol = 'https://www.ebi.ac.uk/pdbe/static/entry/';
  urlLiteMol2 = '_updated.cif';
  pdb;
  end = [];
  ltplugin;
  a = true;
  flag = true;

  public htmlEdit() {
    // deleting button with default color options
    const colOp = document.getElementsByClassName('lm-control-group')[1] as HTMLDivElement;
    // console.log(colOp);
    if ( colOp === undefined) {
      return;
    }
    colOp.parentNode.removeChild(colOp);

    // inserting button with customizable color options
    const myColOp = document.getElementsByClassName('lm-transformer-wrapper')[1] as HTMLDivElement;
    if ( myColOp === undefined) {
      return;
    }

  }

  public colorSeq(entr) {
    if (this.ltplugin === undefined) {
      return;
    }

    const model = this.ltplugin.selectEntities('model')[0] as LiteMol.Bootstrap.Entity.Molecule.Model;

    if (!model) { return; }

    const coloring: ColorDefinition = {
      base: { r: 255, g: 255, b: 255 },
      entries : entr
    };

    const theme = createTheme(model.props.model, coloring);
    applyTheme(this.ltplugin, 'model', theme);
  }

  public async loadMol(id) {
    try {
      const Bootstrap = LiteMol.Bootstrap;
      const ids = id;

      // tslint:disable-next-line:no-non-null-assertion
      this.ltplugin = this.create(document.getElementById('litemol')!);
      await this.ltplugin.loadMolecule({
        id: ids,
        url: this.urlLiteMol + ids + this.urlLiteMol2,
        format: 'cif', // default
        modelRef: 'model',
        doNotCreateVisual: true

      });

      // Use this (or a modification of this) for custom visualization:
      const t = this.ltplugin.createTransform();


      t.add('model',  LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateMacromoleculeVisual, { polymer: true});
      this.ltplugin.command(Bootstrap.Command.Layout.SetState, {
        regionStates: {
          [Bootstrap.Components.LayoutRegion.Left]: 'Hidden',
          [Bootstrap.Components.LayoutRegion.Bottom]: 'Hidden',
          [Bootstrap.Components.LayoutRegion.Right]: 'Sticky'
        },
        hideControls: false
      });

      await  this.ltplugin.applyTransform(t);

    } catch (e) {
      console.error(e);
    }
  }

  public create(target: HTMLElement) {
    const Plugin = LiteMol.Plugin;

    const plugin = Plugin.create({ target, layoutState: { isExpanded: false } });
    plugin.context.logger.message(`LiteMol Plugin ${Plugin.VERSION.number}`);

    return plugin;
  }


  public async draw(idd, colors) {

    await this.loadMol(idd);


    // // MULTIPLE STRUCTURES

    // (document.getElementById('process') as HTMLButtonElement).onclick = process;

  }

  public destroy() {
    this.ltplugin.destroy();
    this.ltplugin = void 0 as any;
  }


}
