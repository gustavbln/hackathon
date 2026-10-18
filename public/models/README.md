# Landing-page train

`high-speed-train.glb` is an original procedural high-speed electric multiple unit, built for this project. Its visual reference is the [Siemens Velaro](https://www.mobility.siemens.com/global/en/portfolio/rolling-stock/high-speed-and-intercity-trains/velaro.html). No third-party geometry, textures or logos are included.

- Three carriages, approximately 77 metres overall, with six-metre sculpted cab noses.
- Physically lit white paint, red waist stripes, dark glazing and rubber window seals.
- Doors, LED headlights, windscreen wipers, gangway bellows, wheelsets, brake discs, suspension, roof ventilation and a pantograph.
- Rails and sleepers are included. X runs along the train, Y is up; wheel contact is Y = 0.
- Proportions and details are illustrative, not engineering measurements or a manufacturer CAD model.
- Approximately 9 MB; no external textures, decoder or remote model service required.

Edit `components/train/create-train.ts` and the `--train-*` tokens in `app/globals.css`, then regenerate inside Docker:

```sh
docker compose exec web node --experimental-strip-types scripts/export-train.mjs
```

`components/train/train-model.tsx` loads the asset into the same client-only React Three Fiber canvas as the interactive cabin. The central carriage has real openings and transparent glass, with the actual seats and cabin visible through them.

`train-depot.tsx` recreates the white arched roofs, brick facade and Siemens workshop sign from the user-supplied reference photograph as a native 3D environment. Its materials use the `--depot-*` theme tokens. The depot and yard remain visible from the cabin windows. This is an illustrative reconstruction, not a surveyed model of the factory.

`train-journey-layout.ts` sequences the lifting garage door, the train's departure and the original window entry. The environment moves relative to the train so the cabin keeps its existing coordinates and seat interactions. The GLB is unchanged; its short baked tracks are hidden in favour of the depot's continuous rails. Focused tests verify stage order, workshop clearance, window clearance, continuity and the final camera pose. `train-scene.tsx` enables cabin controls in the same canvas. The button plays the door lift and departure before the 1.5-second window entry; scrolling can scrub the sequence in either direction. Reduced-motion users retain a stationary exterior until entry.

`high-speed-train-preview.png` is the older blueprint illustration, retained as a design reference.
