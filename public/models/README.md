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

`train-countryside.tsx` supplies the shared sky, terrain, hills and trees for both exterior and interior views. `train-journey-layout.ts` aligns the exterior asset with the cabin, approaches a window, crosses the pane and settles into the normal aisle view. Focused tests verify window clearance, continuity and the final camera pose. `train-scene.tsx` enables the cabin controls without replacing the canvas or navigating away. Reduced-motion users retain a stationary exterior until entry.

`high-speed-train-preview.png` is the older blueprint illustration, retained as a design reference.
