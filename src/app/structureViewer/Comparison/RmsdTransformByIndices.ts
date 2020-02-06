import Structure = LiteMol.Core.Structure;
// // import Base = LiteMol.Core.Structure.Molecule.Model.Base;
//
//
//
//
import {findMinimalRmsdTransform, RmsdTransformResult} from './RmsdTransform';

export interface RmsdTransformByIndicesResult {
  transforms: RmsdTransformResult[];
  averageRmsd: number;
}

export interface RmsdTransformByIndicesEntry {
  model: Structure.Molecule.Model;
  atomIndices: number[];
}

function makePositionTable(model: Structure.Molecule.Model, indices: number[]) {
  const table = LiteMol.Core.Utils.DataTable.builder<LiteMol.Core.Structure.Position>(indices.length);
  const x = table.addColumn('x', s => new Float64Array(s));
  const y = table.addColumn('y', s => new Float64Array(s));
  const z = table.addColumn('z', s => new Float64Array(s));

  const xs = model.positions.x;
  const ys = model.positions.y;
  const zs = model.positions.z;

  let i = 0;

  for (const aI of indices) {
    x[i] = xs[aI];
    y[i] = ys[aI];
    z[i] = zs[aI];
    i++;
  }

  return table.seal();
}

export function superimposeByIndices(data: RmsdTransformByIndicesEntry[]): RmsdTransformByIndicesResult {
  const transforms: RmsdTransformResult[] = [];
  let averageRmsd = 0;

  for (let i = 1; i < data.length; i++) {
    const t = findMinimalRmsdTransform({
      a: makePositionTable(data[0].model, data[0].atomIndices),
      b: makePositionTable(data[i].model, data[i].atomIndices)
    });
    transforms.push(t);
    averageRmsd += t.rmsd;
  }

  averageRmsd /= Math.max(transforms.length, 1);

  return { transforms, averageRmsd };
}
