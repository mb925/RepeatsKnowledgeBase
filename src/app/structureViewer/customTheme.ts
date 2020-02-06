import LiteMol from 'litemol';
const Core = LiteMol.Core;
const Q = Core.Structure.Query;


export interface Color { r: number; g: number; b: number; }

export interface SequenceEntry {
    entity_id: string;
    struct_asym_id: string;
    start_residue_number: number;
    end_residue_number: number;
    color: Color;
  }

export interface ColorDefinition { entries: SequenceEntry[]; base: Color; }

class ColorMapper {
    private uniqueColors: LiteMol.Visualization.Color[] = [];
    private map = Core.Utils.FastMap.create<string, number>();

    get colorMap() {
      const map = Core.Utils.FastMap.create<number, LiteMol.Visualization.Color>();
      this.uniqueColors.forEach((c, i) => map.set(i, c));
      return map;
    }

    addColor(color: Color) {
      const id = `${color.r}-${color.g}-${color.b}`;
      if (this.map.has(id)) {
        return this.map.get(id)!; }
      const index = this.uniqueColors.length;

      this.uniqueColors.push(LiteMol.Visualization.Color.fromRgb(color.r, color.g, color.b));
      this.map.set(id, index);


      return index;
    }
  }

export function createTheme(model: LiteMol.Core.Structure.Molecule.Model, colorDef: ColorDefinition) {
    const mapper = new ColorMapper();
    mapper.addColor(colorDef.base);
    const map = new Uint8Array(model.data.atoms.count);
    for (const e of colorDef.entries) {
      const query = Q.sequence(e.entity_id.toString(), e.struct_asym_id,
        { seqNumber: e.start_residue_number }, { seqNumber: e.end_residue_number }).compile();

      const colorIndex = mapper.addColor(e.color);

      for (const f of query(model.queryContext).fragments) {

        for (const a of f.atomIndices) {

          map[a] = colorIndex;

        }
      }
    }

    const fallbackColor = { r: 0.6, g: 0.6, b: 0.6 } as LiteMol.Visualization.Color;
    const selectionColor = { r: 0, g: 0, b: 1 } as LiteMol.Visualization.Color;
    const highlightColor = { r: 1, g: 0, b: 1 } as LiteMol.Visualization.Color;

    const colors = Core.Utils.FastMap.create<string, LiteMol.Visualization.Color>();
    colors.set('Uniform', fallbackColor);
    colors.set('Selection', selectionColor);
    colors.set('Highlight', highlightColor);

    const mapping = LiteMol.Visualization.Theme.createColorMapMapping(i => map[i], mapper.colorMap, fallbackColor);
    // make the theme "sticky" so that it persist "ResetScene" command.
    return LiteMol.Visualization.Theme.createMapping(mapping, { colors, isSticky: true });
  }

export function applyTheme(plugin: LiteMol.Plugin.Controller, modelRef: string, theme: LiteMol.Visualization.Theme) {



    const visuals = plugin.selectEntities(LiteMol.Bootstrap.Tree.Selection.byRef(modelRef)
      .subtree().ofType(LiteMol.Bootstrap.Entity.Molecule.Visual));
    for (const v of visuals) {
        plugin.command(LiteMol.Bootstrap.Command.Visual.UpdateBasicTheme, { visual: v as any, theme });
      }

  }
