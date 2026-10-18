import assert from "node:assert/strict";
import test from "node:test";
import { Quaternion, Vector3 } from "three";
import { CABIN_TO_TRAIN, trainJourneyPose } from "./train-journey-layout.ts";

for (const portrait of [false, true]) {
  test(`journey crosses the open passenger window (${portrait ? "phone" : "desktop"})`, () => {
    let crossings = 0;
    for (let step = 0; step <= 1000; step++) {
      const point = trainJourneyPose(step / 1000, portrait).position.applyMatrix4(CABIN_TO_TRAIN);
      assert.ok(point.toArray().every(Number.isFinite));
      if (point.z > 1.1 && point.z < 1.6) {
        assert.ok(point.x > -0.2 && point.x < 0.97, "camera must stay between the window's vertical seals");
        assert.ok(point.y > 2.6 && point.y < 3.2, "camera must clear the upper and lower seals");
        crossings++;
      }
    }
    assert.ok(crossings > 0, "camera must actually pass through the window");
  });

  test(`journey hands off at the existing cabin home view (${portrait ? "phone" : "desktop"})`, () => {
    const pose = trainJourneyPose(1, portrait);
    assert.ok(pose.position.distanceTo(new Vector3(0, 1.65, 4.6)) < 0.000001);
    assert.ok(pose.quaternion.angleTo(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.04)) < 0.000001);
    assert.equal(pose.fov, portrait ? 80 : 62);
  });
}

test("camera position and orientation remain continuous at each stage boundary", () => {
  for (const progress of [0.65, 0.77, 0.83, 0.9]) {
    const before = trainJourneyPose(progress - 0.00001, false);
    const after = trainJourneyPose(progress + 0.00001, false);
    assert.ok(before.position.distanceTo(after.position) < 0.01);
    assert.ok(before.quaternion.angleTo(after.quaternion) < 0.01);
  }
});
