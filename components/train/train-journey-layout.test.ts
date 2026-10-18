import assert from "node:assert/strict";
import test from "node:test";
import { Quaternion, Vector3 } from "three";
import { CABIN_TO_TRAIN, DEPOT_FRONT_X, depotJourney, trainJourneyPose } from "./train-journey-layout.ts";

test("the door clears before departure and the train leaves before boarding", () => {
  for (let step = 0; step <= 1000; step++) {
    const { door, departure, boarding, offset } = depotJourney(step / 1000);
    for (const phase of [door, departure, boarding]) {
      assert.ok(phase >= 0 && phase <= 1);
    }
    if (departure > 0) assert.equal(door, 1, "the train cannot move through a closed door");
    if (boarding > 0) assert.equal(departure, 1, "boarding begins after departure finishes");
    assert.ok(offset >= -84 && offset <= 0);
  }

  assert.deepEqual(depotJourney(-1), { door: 0, departure: 0, boarding: 0, offset: -0 });
  assert.deepEqual(depotJourney(2), { door: 1, departure: 1, boarding: 1, offset: -84 });
  assert.ok(DEPOT_FRONT_X > 38.65, "the closed door begins beyond the train nose");
  assert.ok(DEPOT_FRONT_X + depotJourney(0.6).offset < -38.65, "the rear carriage clears the depot before boarding");
});

for (const portrait of [false, true]) {
  test(`camera holds the depot view while the door opens (${portrait ? "phone" : "desktop"})`, () => {
    const start = trainJourneyPose(0, portrait);
    const doorOpen = trainJourneyPose(0.2, portrait);
    assert.ok(start.position.distanceTo(doorOpen.position) < 0.000001);
    assert.ok(start.quaternion.angleTo(doorOpen.quaternion) < 0.000001);
    assert.equal(start.fov, doorOpen.fov);
  });

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
  test(`camera position and orientation remain continuous (${portrait ? "phone" : "desktop"})`, () => {
    for (let step = 0; step <= 1000; step++) {
      const progress = step / 1000;
      const before = trainJourneyPose(progress - 0.000001, portrait);
      const after = trainJourneyPose(progress + 0.000001, portrait);
      assert.ok(before.position.distanceTo(after.position) < 0.01);
      assert.ok(before.quaternion.angleTo(after.quaternion) < 0.01);
      assert.ok(Math.abs(before.fov - after.fov) < 0.01);
    }
  });
}
