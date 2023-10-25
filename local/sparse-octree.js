/**
 * sparse-octree v7.1.5 build Sat Feb 26 2022
 * https://github.com/vanruesc/sparse-octree
 * Copyright 2022 Raoul van Rüschen
 * @license Zlib
 */
// src/core/edges.ts
var edges = [
  new Uint8Array([0, 4]),
  new Uint8Array([1, 5]),
  new Uint8Array([2, 6]),
  new Uint8Array([3, 7]),
  new Uint8Array([0, 2]),
  new Uint8Array([1, 3]),
  new Uint8Array([4, 6]),
  new Uint8Array([5, 7]),
  new Uint8Array([0, 1]),
  new Uint8Array([2, 3]),
  new Uint8Array([4, 5]),
  new Uint8Array([6, 7])
];

// src/core/layout.ts
var layout = [
  new Uint8Array([0, 0, 0]),
  new Uint8Array([0, 0, 1]),
  new Uint8Array([0, 1, 0]),
  new Uint8Array([0, 1, 1]),
  new Uint8Array([1, 0, 0]),
  new Uint8Array([1, 0, 1]),
  new Uint8Array([1, 1, 0]),
  new Uint8Array([1, 1, 1])
];

// src/core/CubicOctant.ts
const { Vector3 } = require("three");
var c = new Vector3();
var CubicOctant = class {
  min;
  children;
  data;
  size;
  constructor(min = new Vector3(), size = 0) {
    this.min = min;
    this.size = size;
    this.children = null;
    this.data = null;
  }
  get max() {
    return this.min.clone().addScalar(this.size);
  }
  getCenter(target) {
    return target.copy(this.min).addScalar(this.size * 0.5);
  }
  getDimensions(target) {
    return target.set(this.size, this.size, this.size);
  }
  split() {
    const min = this.min;
    const mid = this.getCenter(c);
    const halfSize = this.size * 0.5;
    const children = this.children = [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ];
    for (let i = 0; i < 8; ++i) {
      const combination = layout[i];
      const child = new this.constructor();
      child.min.set(combination[0] === 0 ? min.x : mid.x, combination[1] === 0 ? min.y : mid.y, combination[2] === 0 ? min.z : mid.z);
      child.size = halfSize;
      children[i] = child;
    }
  }
};

// src/core/Octant.ts
const Vector32 = require("three").Vector3;
var c2 = new Vector32();
var Octant = class {
  min;
  max;
  children;
  data;
  constructor(min = new Vector32(), max = new Vector32()) {
    this.min = min;
    this.max = max;
    this.children = null;
    this.data = null;
  }
  getCenter(result) {
    return result.addVectors(this.min, this.max).multiplyScalar(0.5);
  }
  getDimensions(result) {
    return result.subVectors(this.max, this.min);
  }
  split() {
    const min = this.min;
    const max = this.max;
    const mid = this.getCenter(c2);
    const children = this.children = [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ];
    for (let i = 0; i < 8; ++i) {
      const combination = layout[i];
      const child = new this.constructor();
      child.min.set(combination[0] === 0 ? min.x : mid.x, combination[1] === 0 ? min.y : mid.y, combination[2] === 0 ? min.z : mid.z);
      child.max.set(combination[0] === 0 ? mid.x : max.x, combination[1] === 0 ? mid.y : max.y, combination[2] === 0 ? mid.z : max.z);
      children[i] = child;
    }
  }
};

// src/core/Octree.ts
// import { Box3 as Box33 } from "three";
const Box33 = require("three").Box3;

// src/raycasting/RaycastingFlags.ts
var RaycastingFlags = class {
  value;
  constructor() {
    this.value = 0;
  }
};

// src/raycasting/findEntryOctant.ts
function findEntryOctant(tx0, ty0, tz0, txm, tym, tzm) {
  let entry = 0;
  if (tx0 > ty0 && tx0 > tz0) {
    if (tym < tx0) {
      entry |= 2;
    }
    if (tzm < tx0) {
      entry |= 1;
    }
  } else if (ty0 > tz0) {
    if (txm < ty0) {
      entry |= 4;
    }
    if (tzm < ty0) {
      entry |= 1;
    }
  } else {
    if (txm < tz0) {
      entry |= 4;
    }
    if (tym < tz0) {
      entry |= 2;
    }
  }
  return entry;
}

// src/raycasting/findNextOctant.ts
var octantTable = [
  new Uint8Array([4, 2, 1]),
  new Uint8Array([5, 3, 8]),
  new Uint8Array([6, 8, 3]),
  new Uint8Array([7, 8, 8]),
  new Uint8Array([8, 6, 5]),
  new Uint8Array([8, 7, 8]),
  new Uint8Array([8, 8, 7]),
  new Uint8Array([8, 8, 8])
];
function findNextOctant(currentOctant, tx1, ty1, tz1) {
  let min;
  let exit;
  if (tx1 < ty1) {
    min = tx1;
    exit = 0;
  } else {
    min = ty1;
    exit = 1;
  }
  if (tz1 < min) {
    exit = 2;
  }
  return octantTable[currentOctant][exit];
}

// src/raycasting/intersectOctree.ts
// import { Box3, Ray, Vector3 as Vector33 } from "three";
const { Box3, Ray } = require("three");
const Vector33 = require("three").Vector3;
var v = new Vector33();
var b = new Box3();
var d = new Box3();
var r = new Ray();
function intersectOctree(octree, ray, flags2) {
  const min = b.min.set(0, 0, 0);
  const max = b.max.subVectors(octree.max, octree.min);
  const dimensions = octree.getDimensions(d.min);
  const halfDimensions = d.max.copy(dimensions).multiplyScalar(0.5);
  const origin = r.origin.copy(ray.origin);
  const direction = r.direction.copy(ray.direction);
  origin.sub(octree.getCenter(v)).add(halfDimensions);
  flags2.value = 0;
  if (direction.x < 0) {
    origin.x = dimensions.x - origin.x;
    direction.x = -direction.x;
    flags2.value |= 4;
  } else if (direction.x === 0) {
    direction.x = Number.EPSILON;
  }
  if (direction.y < 0) {
    origin.y = dimensions.y - origin.y;
    direction.y = -direction.y;
    flags2.value |= 2;
  } else if (direction.y === 0) {
    direction.y = Number.EPSILON;
  }
  if (direction.z < 0) {
    origin.z = dimensions.z - origin.z;
    direction.z = -direction.z;
    flags2.value |= 1;
  } else if (direction.z === 0) {
    direction.z = Number.EPSILON;
  }
  const invDirX = 1 / direction.x;
  const invDirY = 1 / direction.y;
  const invDirZ = 1 / direction.z;
  const tx0 = (min.x - origin.x) * invDirX;
  const tx1 = (max.x - origin.x) * invDirX;
  const ty0 = (min.y - origin.y) * invDirY;
  const ty1 = (max.y - origin.y) * invDirY;
  const tz0 = (min.z - origin.z) * invDirZ;
  const tz1 = (max.z - origin.z) * invDirZ;
  const hit = Math.max(tx0, ty0, tz0) < Math.min(tx1, ty1, tz1);
  return hit ? [tx0, ty0, tz0, tx1, ty1, tz1] : null;
}

// src/raycasting/OctreeRaycaster.ts
var flags = new RaycastingFlags();
function raycastOctant(node, tx0, ty0, tz0, tx1, ty1, tz1, result) {
  if (tx1 >= 0 && ty1 >= 0 && tz1 >= 0) {
    const c3 = node.children;
    if (c3 === null) {
      result.push(node);
    } else {
      const txm = 0.5 * (tx0 + tx1);
      const tym = 0.5 * (ty0 + ty1);
      const tzm = 0.5 * (tz0 + tz1);
      const f = flags.value;
      let currentOctant = findEntryOctant(tx0, ty0, tz0, txm, tym, tzm);
      while (currentOctant < 8) {
        switch (currentOctant) {
          case 0:
            raycastOctant(c3[f], tx0, ty0, tz0, txm, tym, tzm, result);
            currentOctant = findNextOctant(currentOctant, txm, tym, tzm);
            break;
          case 1:
            raycastOctant(c3[f ^ 1], tx0, ty0, tzm, txm, tym, tz1, result);
            currentOctant = findNextOctant(currentOctant, txm, tym, tz1);
            break;
          case 2:
            raycastOctant(c3[f ^ 2], tx0, tym, tz0, txm, ty1, tzm, result);
            currentOctant = findNextOctant(currentOctant, txm, ty1, tzm);
            break;
          case 3:
            raycastOctant(c3[f ^ 3], tx0, tym, tzm, txm, ty1, tz1, result);
            currentOctant = findNextOctant(currentOctant, txm, ty1, tz1);
            break;
          case 4:
            raycastOctant(c3[f ^ 4], txm, ty0, tz0, tx1, tym, tzm, result);
            currentOctant = findNextOctant(currentOctant, tx1, tym, tzm);
            break;
          case 5:
            raycastOctant(c3[f ^ 5], txm, ty0, tzm, tx1, tym, tz1, result);
            currentOctant = findNextOctant(currentOctant, tx1, tym, tz1);
            break;
          case 6:
            raycastOctant(c3[f ^ 6], txm, tym, tz0, tx1, ty1, tzm, result);
            currentOctant = findNextOctant(currentOctant, tx1, ty1, tzm);
            break;
          case 7:
            raycastOctant(c3[f ^ 7], txm, tym, tzm, tx1, ty1, tz1, result);
            currentOctant = 8;
            break;
        }
      }
    }
  }
}
var OctreeRaycaster = class {
  static intersectOctree(node, ray) {
    const result = [];
    const t = intersectOctree(node, ray, flags);
    if (t !== null) {
      raycastOctant(node, t[0], t[1], t[2], t[3], t[4], t[5], result);
    }
    return result;
  }
};

// src/core/OctreeIterator.ts
// import { Box3 as Box32 } from "three";
const Box32 = require("three").Box3;
var b2 = new Box32();
var OctreeIterator = class {
  root;
  region;
  cull;
  result;
  trace;
  indices;
  constructor(root, region = null) {
    this.root = root;
    this.region = region;
    this.cull = region !== null;
    this.trace = null;
    this.indices = null;
    this.reset();
  }
  reset() {
    const root = this.root;
    this.trace = [];
    this.indices = [];
    if (root !== null) {
      b2.min = root.min;
      b2.max = root.max;
      if (!this.cull || this.region.intersectsBox(b2)) {
        this.trace.push(root);
        this.indices.push(0);
      }
    }
    this.result = {
      done: false,
      value: null
    };
    return this;
  }
  next() {
    const cull2 = this.cull;
    const region = this.region;
    const indices = this.indices;
    const trace = this.trace;
    let octant = null;
    let depth = trace.length - 1;
    while (octant === null && depth >= 0) {
      const index = indices[depth]++;
      const children = trace[depth].children;
      if (index < 8) {
        if (children !== null) {
          const child = children[index];
          if (cull2) {
            b2.min = child.min;
            b2.max = child.max;
            if (!region.intersectsBox(b2)) {
              continue;
            }
          }
          trace.push(child);
          indices.push(0);
          ++depth;
        } else {
          octant = trace.pop();
          indices.pop();
        }
      } else {
        trace.pop();
        indices.pop();
        --depth;
      }
    }
    this.result.value = octant;
    this.result.done = octant === null;
    return this.result;
  }
  [Symbol.iterator]() {
    return this;
  }
};

// src/core/Octree.ts
var b3 = new Box33();
function getDepth(node) {
  const children = node.children;
  let result = 0;
  if (children !== null) {
    for (let i = 0, l = children.length; i < l; ++i) {
      const d2 = 1 + getDepth(children[i]);
      if (d2 > result) {
        result = d2;
      }
    }
  }
  return result;
}
function cull(node, region, result) {
  const children = node.children;
  b3.min = node.min;
  b3.max = node.max;
  if (region.intersectsBox(b3)) {
    if (children !== null) {
      for (let i = 0, l = children.length; i < l; ++i) {
        cull(children[i], region, result);
      }
    } else {
      result.push(node);
    }
  }
}
function findNodesByLevel(node, level, depth, result) {
  const children = node.children;
  if (depth === level) {
    result.push(node);
  } else if (children !== null) {
    ++depth;
    for (let i = 0, l = children.length; i < l; ++i) {
      findNodesByLevel(children[i], level, depth, result);
    }
  }
}
var Octree = class {
  root;
  constructor(root) {
    this.root = root;
  }
  get min() {
    return this.root.min;
  }
  get max() {
    return this.root.max;
  }
  get children() {
    return this.root.children;
  }
  getCenter(result) {
    return this.root.getCenter(result);
  }
  getDimensions(result) {
    return this.root.getDimensions(result);
  }
  cull(region) {
    const result = [];
    cull(this.root, region, result);
    return result;
  }
  getDepth() {
    return getDepth(this.root);
  }
  findNodesByLevel(level) {
    const result = [];
    findNodesByLevel(this.root, level, 0, result);
    return result;
  }
  getIntersectingNodes(raycaster) {
    return OctreeRaycaster.intersectOctree(this.root, raycaster.ray);
  }
  leaves(region = null) {
    return new OctreeIterator(this.root, region);
  }
  [Symbol.iterator]() {
    return new OctreeIterator(this.root);
  }
};

// src/core/OctreeHelper.ts
const { BufferAttribute, BufferGeometry, Group, LineSegments, LineBasicMaterial } = require("three");
var OctreeHelper = class extends Group {
  octree;
  constructor(octree = null) {
    super();
    this.name = "OctreeHelper";
    this.octree = octree;
    this.update();
  }
  createLineSegments(octants, octantCount) {
    const iterator = octants[Symbol.iterator]();
    const maxOctants = Math.pow(2, 16) / 8 - 1;
    const group = new Group();
    const material = new LineBasicMaterial({
      color: 16777215 * Math.random()
    });
    for (let i = 0, l = 0, n = Math.ceil(octantCount / maxOctants); n > 0; --n) {
      l += octantCount < maxOctants ? octantCount : maxOctants;
      octantCount -= maxOctants;
      const vertexCount = l * 8;
      const indices = new Uint16Array(vertexCount * 3);
      const positions = new Float32Array(vertexCount * 3);
      for (let c3 = 0, d2 = 0, result = iterator.next(); !result.done && i < l; ) {
        const octant = result.value;
        const min = octant.min;
        const max = octant.max;
        for (let j = 0; j < 12; ++j) {
          const edge = edges[j];
          indices[d2++] = c3 + edge[0];
          indices[d2++] = c3 + edge[1];
        }
        for (let j = 0; j < 8; ++j, ++c3) {
          const corner = layout[j];
          positions[c3 * 3] = corner[0] === 0 ? min.x : max.x;
          positions[c3 * 3 + 1] = corner[1] === 0 ? min.y : max.y;
          positions[c3 * 3 + 2] = corner[2] === 0 ? min.z : max.z;
        }
        if (++i < l) {
          result = iterator.next();
        }
      }
      const geometry = new BufferGeometry();
      geometry.setIndex(new BufferAttribute(indices, 1));
      geometry.setAttribute("position", new BufferAttribute(positions, 3));
      group.add(new LineSegments(geometry, material));
    }
    this.add(group);
  }
  update() {
    this.dispose();
    const depth = this.octree !== null ? this.octree.getDepth() : -1;
    for (let level = 0; level <= depth; ++level) {
      const result = this.octree.findNodesByLevel(level);
      this.createLineSegments(result, result.length);
    }
  }
  dispose() {
    const groups = this.children;
    for (let i = 0, il = groups.length; i < il; ++i) {
      const group = groups[i];
      const children = group.children;
      for (let j = 0, jl = children.length; j < jl; ++j) {
        const lineSegments = children[j];
        lineSegments.geometry.dispose();
        if (Array.isArray(lineSegments.material)) {
          for (const m of lineSegments.material) {
            m.dispose();
          }
        } else {
          lineSegments.material.dispose();
        }
      }
      while (children.length > 0) {
        group.remove(children[0]);
      }
    }
    while (groups.length > 0) {
      this.remove(groups[0]);
    }
  }
};

// src/points/PointContainer.ts
var PointContainer = class {
  data;
  point;
  distance;
  constructor(point = null, data = null, distance = 0) {
    this.point = point;
    this.data = data;
    this.distance = distance;
  }
};

// src/points/PointData.ts
// import { Vector3 as Vector35 } from "three";
const Vector35 = require("three").Vector3;

// src/points/RayPointIntersection.ts
var RayPointIntersection = class extends PointContainer {
  distanceToRay;
  constructor(distanceToOrigin, distanceToRay, point, data = null) {
    super(point, data, distanceToOrigin);
    this.distanceToRay = distanceToRay;
  }
};

// src/points/PointData.ts
var PointData = class {
  points;
  data;
  constructor() {
    this.points = [];
    this.data = [];
  }
  testPoints(raycaster, result) {
    const threshold = raycaster.params.Points.threshold;
    const thresholdSq = threshold * threshold;
    const ray = raycaster.ray;
    const points = this.points;
    const data = this.data;
    for (let i = 0, l = points.length; i < l; ++i) {
      const point = points[i];
      const distanceToRaySq = ray.distanceSqToPoint(point);
      if (distanceToRaySq < thresholdSq) {
        const closestPoint = ray.closestPointToPoint(point, new Vector35());
        const distance = ray.origin.distanceTo(closestPoint);
        if (distance >= raycaster.near && distance <= raycaster.far) {
          result.push(new RayPointIntersection(distance, Math.sqrt(distanceToRaySq), closestPoint, data[i]));
        }
      }
    }
  }
};

// src/points/PointOctant.ts
// import { Vector3 as Vector36 } from "three";
const Vector36 = require("three").Vector3;
var p = new Vector36();
var PointOctant = class extends Octant {
  constructor(min, max) {
    super(min, max);
  }
  distanceToSquared(point) {
    const clampedPoint = p.copy(point).clamp(this.min, this.max);
    return clampedPoint.sub(point).lengthSq();
  }
  distanceToCenterSquared(point) {
    const center = this.getCenter(p);
    const dx = point.x - center.x;
    const dy = point.y - center.x;
    const dz = point.z - center.z;
    return dx * dx + dy * dy + dz * dz;
  }
  contains(point, bias) {
    const min = this.min;
    const max = this.max;
    return point.x >= min.x - bias && point.y >= min.y - bias && point.z >= min.z - bias && point.x <= max.x + bias && point.y <= max.y + bias && point.z <= max.z + bias;
  }
  redistribute(bias) {
    const children = this.children;
    const pointData = this.data;
    if (children !== null && pointData !== null) {
      const points = pointData.points;
      const data = pointData.data;
      for (let i = 0, il = points.length; i < il; ++i) {
        const point = points[i];
        const entry = data[i];
        for (let j = 0, jl = children.length; j < jl; ++j) {
          const child = children[j];
          if (child.contains(point, bias)) {
            if (child.data === null) {
              child.data = new PointData();
            }
            const childData = child.data;
            childData.points.push(point);
            childData.data.push(entry);
            break;
          }
        }
      }
      this.data = null;
    }
  }
  merge() {
    const children = this.children;
    if (children !== null) {
      const pointData = new PointData();
      for (let i = 0, l = children.length; i < l; ++i) {
        const child = children[i];
        const childData = child.data;
        if (childData !== null) {
          pointData.points = pointData.points.concat(childData.points);
          pointData.data = pointData.data.concat(childData.data);
        }
      }
      this.children = null;
      this.data = pointData;
    }
  }
};

// src/points/PointOctree.ts
function countPoints(octant) {
  const children = octant.children;
  let result = 0;
  if (children !== null) {
    for (let i = 0, l = children.length; i < l; ++i) {
      result += countPoints(children[i]);
    }
  } else if (octant.data !== null) {
    const pointData = octant.data;
    result = pointData.points.length;
  }
  return result;
}
function set(point, data, octree, octant, depth) {
  let children = octant.children;
  let exists = false;
  let done = false;
  if (octant.contains(point, octree.getBias())) {
    if (children === null) {
      let index = 0;
      if (octant.data === null) {
        octant.data = new PointData();
      } else {
        const pointData2 = octant.data;
        const points = pointData2.points;
        for (let i = 0, l = points.length; !exists && i < l; ++i) {
          exists = points[i].equals(point);
          index = i;
        }
      }
      const pointData = octant.data;
      if (exists) {
        pointData.data[index - 1] = data;
        done = true;
      } else if (pointData.points.length < octree.getMaxPoints() || depth === octree.getMaxDepth()) {
        pointData.points.push(point.clone());
        pointData.data.push(data);
        done = true;
      } else {
        octant.split();
        octant.redistribute(octree.getBias());
        children = octant.children;
      }
    }
    if (children !== null) {
      ++depth;
      for (let i = 0, l = children.length; !done && i < l; ++i) {
        done = set(point, data, octree, children[i], depth);
      }
    }
  }
  return done;
}
function remove(point, octree, octant, parent) {
  const children = octant.children;
  let result = null;
  if (octant.contains(point, octree.getBias())) {
    if (children !== null) {
      for (let i = 0, l = children.length; result === null && i < l; ++i) {
        result = remove(point, octree, children[i], octant);
      }
    } else if (octant.data !== null) {
      const pointData = octant.data;
      const points = pointData.points;
      const data = pointData.data;
      for (let i = 0, l = points.length; i < l; ++i) {
        if (points[i].equals(point)) {
          const last = l - 1;
          result = data[i];
          if (i < last) {
            points[i] = points[last];
            data[i] = data[last];
          }
          points.pop();
          data.pop();
          if (parent !== null && countPoints(parent) <= octree.getMaxPoints()) {
            parent.merge();
          }
          break;
        }
      }
    }
  }
  return result;
}
function get(point, octree, octant) {
  const children = octant.children;
  let result = null;
  if (octant.contains(point, octree.getBias())) {
    if (children !== null) {
      for (let i = 0, l = children.length; result === null && i < l; ++i) {
        result = get(point, octree, children[i]);
      }
    } else if (octant.data !== null) {
      const pointData = octant.data;
      const points = pointData.points;
      const data = pointData.data;
      for (let i = 0, l = points.length; result === null && i < l; ++i) {
        if (point.equals(points[i])) {
          result = data[i];
        }
      }
    }
  }
  return result;
}
function move(point, position, octree, octant, parent, depth) {
  const children = octant.children;
  let result = null;
  if (octant.contains(point, octree.getBias())) {
    if (octant.contains(position, octree.getBias())) {
      if (children !== null) {
        ++depth;
        for (let i = 0, l = children.length; result === null && i < l; ++i) {
          const child = children[i];
          result = move(point, position, octree, child, octant, depth);
        }
      } else if (octant.data !== null) {
        const pointData = octant.data;
        const points = pointData.points;
        const data = pointData.data;
        for (let i = 0, l = points.length; i < l; ++i) {
          if (point.equals(points[i])) {
            points[i].copy(position);
            result = data[i];
            break;
          }
        }
      }
    } else {
      result = remove(point, octree, octant, parent);
      set(position, result, octree, parent, depth - 1);
    }
  }
  return result;
}
function findNearestPoint(point, maxDistance, skipSelf, octant) {
  let result = null;
  let bestDistance = maxDistance;
  if (octant.children !== null) {
    const sortedChildren = octant.children.map((child) => {
      const octant2 = child;
      return {
        distance: octant2.distanceToCenterSquared(point),
        octant: octant2
      };
    }).sort((a, b4) => a.distance - b4.distance);
    for (let i = 0, l = sortedChildren.length; i < l; ++i) {
      const child = sortedChildren[i].octant;
      if (child.contains(point, bestDistance)) {
        const intermediateResult = findNearestPoint(point, bestDistance, skipSelf, child);
        if (intermediateResult !== null) {
          bestDistance = intermediateResult.distance;
          result = intermediateResult;
          if (bestDistance === 0) {
            break;
          }
        }
      }
    }
  } else if (octant.data !== null) {
    const pointData = octant.data;
    const points = pointData.points;
    const data = pointData.data;
    let index = -1;
    for (let i = 0, l = points.length; i < l; ++i) {
      if (points[i].equals(point)) {
        if (!skipSelf) {
          bestDistance = 0;
          index = i;
          break;
        }
      } else {
        const distance = point.distanceTo(points[i]);
        if (distance < bestDistance) {
          bestDistance = distance;
          index = i;
        }
      }
    }
    if (index >= 0) {
      result = new PointContainer(points[index], data[index], bestDistance);
    }
  }
  return result;
}
function findPoints(point, radius, skipSelf, octant, result) {
  const children = octant.children;
  if (children !== null) {
    for (let i = 0, l = children.length; i < l; ++i) {
      const child = children[i];
      if (child.contains(point, radius)) {
        findPoints(point, radius, skipSelf, child, result);
      }
    }
  } else if (octant.data !== null) {
    const pointData = octant.data;
    const points = pointData.points;
    const data = pointData.data;
    for (let i = 0, l = points.length; i < l; ++i) {
      const p2 = points[i];
      if (p2.equals(point)) {
        if (!skipSelf) {
          result.push(new PointContainer(p2.clone(), data[i], 0));
        }
      } else {
        const rSq = radius * radius;
        let dSq = p2.distanceTo(point);
        dSq *= dSq;
        if (dSq <= rSq) {
          result.push(new PointContainer(p2.clone(), data[i], Math.sqrt(dSq)));
        }
      }
    }
  }
}
var PointOctree = class extends Octree {
  bias;
  maxPoints;
  maxDepth;
  constructor(min, max, bias = 0, maxPoints = 8, maxDepth = 8) {
    super(new PointOctant(min, max));
    this.bias = Math.max(0, bias);
    this.maxPoints = Math.max(1, Math.round(maxPoints));
    this.maxDepth = Math.max(0, Math.round(maxDepth));
  }
  getBias() {
    return this.bias;
  }
  getMaxPoints() {
    return this.maxPoints;
  }
  getMaxDepth() {
    return this.maxDepth;
  }
  countPoints(octant = this.root) {
    return countPoints(octant);
  }
  set(point, data) {
    return set(point, data, this, this.root, 0);
  }
  remove(point) {
    return remove(point, this, this.root, null);
  }
  get(point) {
    return get(point, this, this.root);
  }
  move(point, position) {
    return move(point, position, this, this.root, null, 0);
  }
  findNearestPoint(point, maxDistance = Number.POSITIVE_INFINITY, skipSelf = false) {
    const root = this.root;
    const result = findNearestPoint(point, maxDistance, skipSelf, root);
    if (result !== null) {
      result.point = result.point.clone();
    }
    return result;
  }
  findPoints(point, radius, skipSelf = false) {
    const result = [];
    findPoints(point, radius, skipSelf, this.root, result);
    return result;
  }
  raycast(raycaster) {
    const result = [];
    const octants = super.getIntersectingNodes(raycaster);
    if (octants.length > 0) {
      for (let i = 0, l = octants.length; i < l; ++i) {
        const octant = octants[i];
        const pointData = octant.data;
        if (pointData !== null) {
          pointData.testPoints(raycaster, result);
        }
      }
    }
    return result;
  }
};
module.exports = {
  CubicOctant,
  Octant,
  Octree,
  OctreeHelper,
  OctreeIterator,
  OctreeRaycaster,
  PointContainer,
  PointData,
  PointOctant,
  PointOctree,
  RayPointIntersection,
  RaycastingFlags,
  edges,
  findEntryOctant,
  findNextOctant,
  intersectOctree,
  layout
};
