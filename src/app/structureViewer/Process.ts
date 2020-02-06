 import Transformer = LiteMol.Bootstrap.Entity.Transformer;


 export function fetch(plugin: LiteMol.Plugin.Controller, ids: string[], createVisuals = false): Promise<{}> {
        return new Promise(async (res, rej) => {

            const ts = ids
                .filter(id => id.length === 4)
                .map(id => id.toLowerCase())
                .map(id => {
                    const t = plugin.createTransform();
                    // download cartoon representation data from the CoordinateServer and parse the result
                    const model = t.add(plugin.root, Transformer.Data.Download,
                      { url: `https://cs.litemol.org/${id}/cartoon?encoding=bcif`, type: 'Binary', id })
                        .then(Transformer.Molecule.CreateFromData,
                          { format: LiteMol.Core.Formats.Molecule.SupportedFormats.mmBCIF }, { isBinding: true })
                        .then(Transformer.Molecule.CreateModel, { modelIndex: 0 }, { ref: id /* makes it easier to reference later */ });
                    if (createVisuals) {
                        model.then(Transformer.Molecule.CreateMacromoleculeVisual, { polymer: true, het: true }, {});
                    }
                    return { id, t };

                })
                .map(({ id, t }) => new Promise<{ id: string, ok: boolean }>(async res => {
                  try {
                        await plugin.applyTransform(t);
                        res({ id, ok: true });
                  } catch (e) {
                        res({ id, ok: false });
                  }
                }));

            const rs = await Promise.all(ts);

            const notOK = rs.filter(r => !r.ok);
            if (notOK.length) {
                // in a real application, instead of just
                // reporting an error, you would want to
                // retry the download.
                for (const r of notOK) {
                    console.error(r.id + ' not downloaded.');
                }
            }

            if (createVisuals) {
                // Reset the camera so that all the models are visible.
                plugin.command(LiteMol.Bootstrap.Command.Visual.ResetScene);
            }

            res();

        });
    }

 import Q = LiteMol.Core.Structure.Query;
 import {RmsdTransformByIndicesEntry, RmsdTransformByIndicesResult} from './Comparison/RmsdTransformByIndices';

 export interface SuperpositionEntry extends RmsdTransformByIndicesEntry {
        id: string;
    }

 export function getSuperpositionData(plugin: LiteMol.Plugin.Controller): SuperpositionEntry[] {
        // selects all the Models that were downloaded

        const models = plugin.context.select(LiteMol.Bootstrap.Tree.Selection.subtree(plugin.root)
          .ofType(LiteMol.Bootstrap.Entity.Molecule.Model)) as LiteMol.Bootstrap.Entity.Molecule.Model[];

        // Find CA atoms inside polymer entities
        const query = Q.atomsByName('CA').inside(Q.entities({ type: 'polymer' })).union();
        const xs = models
            .map(m => ({ id: m.ref, model: m.props.model, fragments: Q.apply(query, m.props.model) }))
            .filter(x => !!x.fragments.length)
            .map(x => ({ id: x.id, model: x.model, atomIndices: x.fragments.fragments[0].atomIndices  }));
        if (!xs.length) {

          throw new Error('No valid molecules.');
        }

        // Find the maximum number of common CA atoms
        const maxCommonLength = xs.reduce((m, x) => Math.min(m, x.atomIndices.length), xs[0].atomIndices.length);

        if (!maxCommonLength) {
            throw new Error('One or more molecules has 0 CA atoms.');
        }

        // Take the common CA atoms
        for (const x of xs) {
            x.atomIndices = Array.prototype.slice.call(x.atomIndices, 0, maxCommonLength);
        }

        return xs;
    }

 export function applyTransforms(plugin: LiteMol.Plugin.Controller, data: SuperpositionEntry[],
                                 superposition: RmsdTransformByIndicesResult) {

        // create the model for the first molecule.
        const first = plugin.createTransform();
        first.add(plugin.context.select(data[0].id)[0] as LiteMol.Bootstrap.Entity.Molecule.Model,
                Transformer.Molecule.CreateMacromoleculeVisual, { polymer: true, het: true }, {});
        plugin.applyTransform(first);

        for (let i = 1; i < data.length; i++) {
            const t = plugin.createTransform();

            // apply the coorresponding 4x4 transform and create a visual.
            // the transform matrix is stored as a 1d array using culumn major order.
            t.add(plugin.context.select(data[i].id)[0] as LiteMol.Bootstrap.Entity.Molecule.Model,
                LiteMol.Bootstrap.Entity.Transformer.Molecule.ModelTransform3D,
              { transform: superposition.transforms[i - 1].bTransform }, { })
              .then(Transformer.Molecule.CreateMacromoleculeVisual, { polymer: true, het: true }, {});
            plugin.applyTransform(t);
        }

        // Reset the camera so that all the models are visible.
        plugin.command(LiteMol.Bootstrap.Command.Visual.ResetScene);
    }
