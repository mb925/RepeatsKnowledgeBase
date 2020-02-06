'use strict';

import PositionTableSchema = LiteMol.Core.Structure.PositionTable;
import LA = LiteMol.Core.Geometry.LinearAlgebra;



export function transformToCentroidCoordinates(table: PositionTableSchema) {
            const centroid = getCentroid(table);
            const atomsX = table.x;
            const atomsY = table.y;
            const atomsZ = table.z;
            for (let i = 0; i < table.count; i++) {
                atomsX[i] -= centroid[0];
                atomsY[i] -= centroid[1];
                atomsZ[i] -= centroid[2];
            }
        }

export function getCentroid(positions: PositionTableSchema): LA.Vector3 {

            const xs = positions.x;
            const ys = positions.y;
            const zs = positions.z;
            const center = LA.Vector3.zero();

            for (let i = 0, l = positions.count; i < l; i++) {
                center[0] += xs[i];
                center[1] += ys[i];
                center[2] += zs[i];
            }

            LA.Vector3.scale(center, center, 1 / positions.count);
            return center;
        }
