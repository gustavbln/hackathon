# Landing-page train

`high-speed-train.glb` is an original procedural high-speed electric multiple unit, built for this project. Its visual reference is the [Siemens Velaro](https://www.mobility.siemens.com/global/en/portfolio/rolling-stock/high-speed-and-intercity-trains/velaro.html). No third-party geometry, textures or logos are included.

- Three carriages, approximately 77 metres overall, with six-metre sculpted cab noses.
- Physically lit white paint, red waist stripes, dark glazing and rubber window seals.
- Doors, LED headlights, windscreen wipers, gangway bellows, wheelsets, brake discs, suspension, roof ventilation and a pantograph.
- Rails and sleepers are included. X runs along the train, Y is up; wheel contact is Y = 0.
- Proportions and details are illustrative, not engineering measurements or a manufacturer CAD model.
- Approximately 8 MB; no external textures, decoder or remote model service required.

Edit `components/train/create-train.ts` and the `--train-*` tokens in `app/globals.css`, then regenerate inside Docker:

```sh
docker compose exec web node --experimental-strip-types scripts/export-train.mjs
```

`components/train/train-model.tsx` loads the asset inside a client-only React Three Fiber canvas. `train-canvas.tsx` supplies studio lighting and a perspective camera that approaches the central passenger window as the visitor scrolls. `train-scene.tsx` then opens the existing interactive cabin. Reduced-motion users retain a stationary exterior and can enter with the button or by scrolling.

`high-speed-train-preview.png` is the older blueprint illustration, retained as a lightweight loading and no-WebGL fallback.
