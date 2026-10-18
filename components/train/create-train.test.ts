import assert from "node:assert/strict";
import { test } from "node:test";
import { Mesh } from "three";
import { createTrain, disposeTrain } from "./create-train.ts";

test("the ICE-style nose closes with a curved, smooth cap instead of a flat tip", () => {
  const train = createTrain({ surface: "#f6f2e8", line: "#81796b", glass: "#d8d1c3", mechanical: "#b6ad9e" },
    { body: "#f7f8f9", stripe: "#d52b36", glass: "#17272f", headlight: "#fff8df" });
  try {
    const nose = train.getObjectByName("Front power car");
    assert.ok(nose instanceof Mesh);
    const positions = nose.geometry.getAttribute("position");
    const normals = nose.geometry.getAttribute("normal");
    let curvedVertices = 0;
    let forwardTip = 0;
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      if (x > 11.5) curvedVertices++;
      if (x > 11.71) forwardTip = Math.max(forwardTip, normals.getX(index));
      assert.ok(Number.isFinite(normals.getX(index)));
    }
    assert.ok(curvedVertices > 100, "the cap must have curved rings beyond the old flat end");
    assert.ok(forwardTip > 0.99, "the rounded tip should face forward smoothly");
    assert.ok(train.getObjectByName("Front power car red nose stripe"));
  } finally {
    disposeTrain(train);
  }
});
