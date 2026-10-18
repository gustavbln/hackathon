import assert from "node:assert/strict";
import { test } from "node:test";
import { Vector3 } from "three";
import { cabinBoxGeometry } from "./cabin-geometry.ts";

test("repeated seat parts reuse body and edge geometry without changing their dimensions", () => {
  for (const rounded of [false, true]) {
    const geometry = cabinBoxGeometry([0.49, 0.14, 0.59], rounded);
    assert.equal(cabinBoxGeometry([0.49, 0.14, 0.59], rounded), geometry);
    assert.notEqual(cabinBoxGeometry([0.51, 0.14, 0.59], rounded), geometry);
    assert.notEqual(cabinBoxGeometry([0.49, 0.14, 0.59], !rounded), geometry);
    geometry.body.computeBoundingBox();
    const dimensions = geometry.body.boundingBox?.getSize(new Vector3()).toArray();
    assert.ok(dimensions);
    dimensions.forEach((dimension, index) => assert.ok(Math.abs(dimension - [0.49, 0.14, 0.59][index]) < 0.000001));
    assert.ok(geometry.edges.getAttribute("position").count > 0);
  }
});
