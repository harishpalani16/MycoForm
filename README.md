# MYCOFORM — Organic cultivation

An open-ended browser game about feeding a spore and discovering the form it grows into. The active experience has no wall, column, roof, or building-envelope primitives.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

Requires Node.js 20.19+ or 22.12+. Open http://localhost:5173. Production files are built in `dist`.

## Deploy

Pushing to `main` builds the site and publishes it to GitHub Pages via `.github/workflows/deploy.yml`. Enable this once per repository: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

The site is served from a project subpath, so `vite.config.ts` sets Vite's `base`. The workflow passes the repository name as `BASE_PATH`, which keeps forks and renames working; local builds fall back to `/MycoForm/`. The dev server is unaffected and still serves from `/`.

## Play

- A single spore starts in open space. Click **Offer the first feeding** for a few nearby food patches, or click/drag **Offer nutrients** to feed manually.
- **Let it grow** runs the organism. Tips explore toward food, branch, fuse, and consume nutrients. Pause whenever you want to intervene.
- Feed a little beyond existing tissue to guide the next growth. **Feeding height** places nutrients in three dimensions. Feed above it to encourage upward growth, sideways to encourage a span, or around protected space to invite a passage.
- Unfed tips become dormant. Food near resting tissue wakes growth; old tissue can also bud again. Continue tending the same organism.
- **Protect open space** creates a repelling, impassable sphere for new growth. **Prune gently** removes local strands. Neither tool draws the final structure.
- **Living tissue** shows reinforced pathways thickening. **Fine fibers** reduces their displayed thickness. Observe mode enables orbit/pan; wheel zoom remains available while feeding.
- Save/Load stores the complete organism locally. Export/Import uses version-3 organism JSON; older building/bridge experiments use separate storage and remain in the source prototypes.

## Simulation

`src/simulation/organism.ts` owns continuous-position tips, persistent nodes and edges, a spatial hash, consumable food, energy, dormancy, branching, fusion, protected regions, deterministic randomness, and graph reinforcement. There is no predefined building geometry, target endpoint, vertical tether, or habitat envelope. Nearby food gradients and direction persistence influence each tip; randomness produces local variation. Edges along root-connected active pathways thicken through a simplified transport calculation. Cycles are abstract game time, not simulated biological years.

`src/rendering/OrganicWorld.tsx` renders three strands per graph edge with two short segments each in a single instanced GPU draw call. The shader interpolates tip extension. `src/OrganicApp.tsx` provides the tending loop and 3D feeding controls.

This is speculative, game-level growth behavior. It does not establish structural safety or reproduce a validated organism. Architecture is an interpretation of the resulting network rather than a scored construction object. Limits: 24,000 nodes, up to 240 tips (140 actively updated), 12 spores, 200 active food patches, and a world extending ±35 m horizontally and 30 m vertically. The current capacity limit ends further node growth; export and start another seed when reached. Pruning hides strands without reclaiming graph node capacity.

Earlier architectural habitat and bridge experiments remain in `src/StudioApp.tsx`, `src/BridgeApp.tsx`, and their simulation modules. They are not loaded by the active entry point. Tests retain their regression checks alongside free-growth food steering, nutrient depletion, dormancy recovery, protected-space avoidance, and reproducible continuation.

## Transform gumball

Choose **Transform / select**, then click a nutrient, spore, or protected-space region. A placement list in the right panel also makes tiny, overlapping, or depleted items selectable. Colored axis arrows move the selected object; nutrient and protected-space resize handles change the influence radius uniformly. Numeric X/Y/Z and radius fields provide precise edits. Shortcuts: W = move, R = resize regions, Esc = deselect. The regions are spherical, so rotation has no meaningful effect and is not exposed.

Selecting the transform tool or editing a placement pauses growth. Resume with Let it grow. Moving food does not refill it; depleted food remains depleted. Food movement wakes nearby resting tissue when nutrients remain. Moving a grown spore translates its entire connected network, including any joined spores, instead of stretching existing strands. Other colonies and environmental fields stay in place. Coordinates and regions persist in the normal organism save/export format.

## Export options and deleting placements

**Export options** pauses growth and offers four formats:

- **Experiment JSON**: the full resumable organism, including nutrients, spores, protected spaces, and random state. This is the only format that can be imported back into the simulation.
- **OBJ centerlines**: lightweight 3D polylines along living strands.
- **OBJ strand mesh**: capped tube geometry with the organism's current strand radii.
- **STL strand mesh**: a binary triangle mesh of the same strand geometry.

Geometry exports support meters or millimeters and 6-sided or 10-sided mesh detail. Geometry uses Y-up and excludes ground, environmental fields, gumballs, and deleted/pruned strands. OBJ/STL importers should be set to the chosen units. Mesh strands are capped individually but their intersections are not boolean-unioned, so fabrication workflows may require mesh cleanup. Exports show fully extended main strands rather than decorative satellite fibers.

In **Transform / select**, select an item and use **Delete selected** or the Delete/Backspace key. Nutrient and protection deletion removes the field itself. Spore deletion removes its entire live connected component, including joined spores, while preserving separate colonies and environmental fields. **Undo delete** restores the most recent deletion while no subsequent simulation or editing change has been made; this avoids overwriting later growth. Graph references and the spatial index are rebuilt after deleting a connected colony.
