# Larger organisms

The organism limit is now 500,000 nodes (previously 24,000). The cultivation area spans X/Z ±250 m and Y up to 150 m. This is a finite simulation budget, not a guaranteed frame rate on every device.

- Rendering allocates 2,048-strand chunks on demand. Each strand uses 36 bytes of instance attributes, replacing six 32-byte instances (192 bytes). Geometry and material data are shared. New growth uploads appended ranges; reinforcement uploads only changed radius chunks. Edits rebuild affected graph storage and invalidate geometry.
- Adaptive detail uses full fibers nearby, single tubes for larger networks, and bent centerlines at distance. No topology is deleted by display simplification. Full-detail and lightweight overrides are available. Chunks use bounding spheres for frustum culling.
- Reinforcement follows cached, chronological rooted ancestry instead of repeatedly rebuilding a shortest-path BFS. Fusion remains in the organism and exports; thickening now follows the original rooted paths. Reusable flow buffers and path compression skip fully thickened trunks. Therefore future thickness patterns can differ from the older algorithm, while saved geometry remains intact.
- Spatial queries exit on the first eligible fusion candidate. Length and established-strand counts update incrementally. Pruning removes dead edges and orphaned nodes and remaps all references, freeing the node budget.
- A frame-driven scheduler limits batches to an 8 ms soft budget and refreshes React statistics at most five times per second. A single step is synchronous and can exceed that budget; the scheduler cannot interrupt it. Large imports, edits, mesh exports and reinforcement of unusually large immature networks can still pause the UI.
- Nutrients disappear from the scene, selection list, and subsequent saves when their remaining quantity reaches zero. Resuming growth clears transform selection so removing a nutrient cannot silently retarget a gumball.
- Fit organism frames current growth and environmental fields. Wide view hides side panels, and mature scenes hide introductory overlays. The camera can view the full expanded growth area.

## Verification

Run `npm test` and `npm run build`. Scale tests cover continued growth past 24,000 nodes, imports at 500,000 nodes, capacity recovery after pruning, nutrient consumption, and deterministic save continuation.

Run `npx tsx scripts/benchmark-organism.ts` for repeatable CPU benchmarks; results are written to `artifacts/growth-benchmark.json`. These synthetic 128-branch networks distinguish immature paths from saturated trunks. They are not biological predictions or browser FPS measurements. The 490,000-node fixture retains room for measured growth.

With the dev server running, visit `/benchmarks/` to exercise the actual renderer at 24,000, 100,000, or 500,000 nodes. Its visible meter reports current frame rate and render counts, including background throttling. A 500,000-node fixture was checked in adaptive and full-fiber modes without console errors. Adaptive distant rendering used 245 draw calls and 999,998 line segments; full fibers used 29,999,940 triangles. Results depend on hardware, camera position, and topology.

The default six-sided STL contains 36 triangles per strand. Very large mesh exports can be substantial; Experiment JSON and OBJ centerlines are more practical for large networks. Display detail never reduces export topology.
