'use strict';

import LA = LiteMol.Core.Geometry.LinearAlgebra;
import Structure = LiteMol.Core.Structure;
import {getCentroid} from './PositionTable';
import {add, compute, createEv, EvdCache, get, reset} from './Evd';

export interface RmsdTransformResult {
  bTransform: number[];
  rmsd: number;
}

export interface RmsdTransformInput {
  a: Structure.PositionTable;
  b: Structure.PositionTable;

  centerA?: LA.Vector3;
  centerB?: LA.Vector3;
}

export class RmsdTransformState {
  a: Structure.PositionTable;
  b: Structure.PositionTable;

  centerA: LA.Vector3;
  centerB: LA.Vector3;

  evdCache: EvdCache = createEv(4);

  translateB = LA.Matrix4.identity();
  rotateB = LA.Matrix4.identity();
  tempMatrix = LA.Matrix4.identity();

  result: RmsdTransformResult;

  constructor(data: RmsdTransformInput, into: RmsdTransformResult) {
    this.a = data.a;
    this.b = data.b;

    if (data.centerA) { this.centerA = data.centerA; } else { this.centerA = getCentroid(data.a); }

    if (data.centerB) { this.centerB = data.centerB; } else { this.centerB = getCentroid(data.b); }

    this.result = into;
  }
}

export function findMinimalRmsdTransform(data: RmsdTransformInput, into?: RmsdTransformResult) {
  if (typeof into === 'undefined') { into = { bTransform: LA.Matrix4.zero(), rmsd: 0.0 }; }
  findMinimalRmsdTransformImpl(new RmsdTransformState(data, into));
  return into;
}

function computeN(state: RmsdTransformState) {

  const N = state.evdCache.matrix;

  reset(N);

  const xsA = state.a.x;
  const ysA = state.a.y;
  const zsA = state.a.z;
  const xsB = state.b.x;
  const ysB = state.b.y;
  const zsB = state.b.z;
  const cA = state.centerA;
  const cB = state.centerB;

  let sizeSq = 0.0;

  for (let i = 0, l = state.a.count; i < l; i++) {
    const aX = xsA[i] - cA[0];
    const aY = ysA[i] - cA[1];
    const aZ = zsA[i] - cA[2];
    const bX = xsB[i] - cB[0];
    const bY = ysB[i] - cB[1];
    const bZ = zsB[i] - cB[2];

    sizeSq += aX * aX + aY * aY + aZ * aZ + bX * bX + bY * bY + bZ * bZ;

    add(N, 0, 0, aX * bX + aY * bY + aZ * bZ);
    add(N, 0, 1, -(aZ * bY) + aY * bZ);
    add(N, 0, 2, aZ * bX - aX * bZ);
    add(N, 0, 3, -(aY * bX) + aX * bY);
    add(N, 1, 0, -(aZ * bY) + aY * bZ);
    add(N, 1, 1, aX * bX - aY * bY - aZ * bZ);
    add(N, 1, 2, aY * bX + aX * bY);
    add(N, 1, 3, aZ * bX + aX * bZ);
    add(N, 2, 0, aZ * bX - aX * bZ);
    add(N, 2, 1, aY * bX + aX * bY);
    add(N, 2, 2, -(aX * bX) + aY * bY - aZ * bZ);
    add(N, 2, 3, aZ * bY + aY * bZ);
    add(N, 3, 0, -(aY * bX) + aX * bY);
    add(N, 3, 1, aZ * bX + aX * bZ);
    add(N, 3, 2, aZ * bY + aY * bZ);
    add(N, 3, 3, -(aX * bX) - aY * bY + aZ * bZ);

    // conjugate instead of transpose.
    // var l = new Quaternion(-a.X, -a.Y, -a.Z, 0).RightMultiplicationToMatrix();
    // l.Transpose();
    // var r = new Quaternion(b.X, b.Y, b.Z, 0).LeftMultiplicationToMatrix();
    // N += l * r;
  }

  return sizeSq;

}

function makeTransformMatrix(state: RmsdTransformState) {
  const ev = state.evdCache.matrix;

  const qX = get(ev, 1, 3);
  const qY = get(ev, 2, 3);
  const qZ = get(ev, 3, 3);
  const qW = get(ev, 0, 3);

  const n1 = 2 * qY * qY;
  const n2 = 2 * qZ * qZ;
  const n3 = 2 * qX * qX;
  const n4 = 2 * qX * qY;
  const n5 = 2 * qW * qZ;
  const n6 = 2 * qX * qZ;
  const n7 = 2 * qW * qY;
  const n8 = 2 * qY * qZ;
  const n9 = 2 * qW * qX;

  let m = state.translateB;
  // translation to center
  LA.Matrix4.setValue(m, 0, 3, -state.centerB[0]);
  LA.Matrix4.setValue(m, 1, 3, -state.centerB[1]);
  LA.Matrix4.setValue(m, 2, 3, -state.centerB[2]);

  m = state.rotateB;
  // rotation
  LA.Matrix4.setValue(m, 0, 0, 1 - n1 - n2);
  LA.Matrix4.setValue(m, 0, 1, n4 + n5);
  LA.Matrix4.setValue(m, 0, 2, n6 - n7);
  LA.Matrix4.setValue(m, 1, 0, n4 - n5);
  LA.Matrix4.setValue(m, 1, 1, 1 - n3 - n2);
  LA.Matrix4.setValue(m, 1, 2, n8 + n9);
  LA.Matrix4.setValue(m, 2, 0, n6 + n7);
  LA.Matrix4.setValue(m, 2, 1, n8 - n9);
  LA.Matrix4.setValue(m, 2, 2, 1 - n3 - n1);
  LA.Matrix4.setValue(m, 3, 3, 1);

  LA.Matrix4.mul(state.tempMatrix, state.rotateB, state.translateB);

  m = state.translateB;
  // translation to center
  LA.Matrix4.setValue(m, 0, 3, state.centerA[0]);
  LA.Matrix4.setValue(m, 1, 3, state.centerA[1]);
  LA.Matrix4.setValue(m, 2, 3, state.centerA[2]);

  LA.Matrix4.mul(state.result.bTransform, state.translateB, state.tempMatrix);
}

function findMinimalRmsdTransformImpl(state: RmsdTransformState): void {

  const sizeSq = computeN(state);

  compute(state.evdCache);
  let rmsd = sizeSq - 2.0 * state.evdCache.eigenValues[3];
  rmsd = rmsd < 0.0 ? 0.0 : Math.sqrt(rmsd / state.a.count);
  makeTransformMatrix(state);
  state.result.rmsd = rmsd;
}
