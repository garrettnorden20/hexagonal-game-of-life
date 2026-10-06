# Hex Life experimental simulator

Open `lab.html` locally, or use the standalone `hex-life-lab.html`. No install, server, account, or network is required. This experimental lab adds 62 exact presets and adjustable hexagonal rules while the repository’s original app and default rule remain unchanged.

## Verified autonomous gun

The default experiment uses **original + B4p + S6 (B2o3om4p/S346H)**. Extra birth occurs with four live neighbors whose two empty neighbors are opposite. Survival also permits six live neighbors.

A 245-cell precursor naturally reaches a 254-cell recurring source after 300 generations. One canonical p61 spaceship escapes every **29,136 generations**. The ship translates by axial **(-3,-1) every 61 generations**; this is separate from the emission interval. The earlier 600/609-cell, 102,000-generation gun remains selectable.

The universe is an unbounded sparse integer lattice. Source view and zoom change only the camera; all offscreen cells remain simulated. Fit view includes every live cell. Stage advances calculate every intervening generation and can be cancelled.

The independent Python verifier replays the complete finite seed and proves that each emitted output stays permanently separate from all future source cycles and older outputs. Historical novelty and global minimality are unconfirmed. This adjusted rule is distinct from the repository’s original rule.

## Checks and rebuild

From the repository root:

- `node experiments/test.js` checks sparse engine behavior against the original app
- `node experiments/lab-state-test.js` checks all 62 presets, complete physical gun cycle, retained output, camera controls and cancellations
- `python3 experiments/ongoing/factory-feedback-order3-gun29136-independent.py` replays and certifies the fast gun using Python’s standard library
- `node experiments/verify-gun.js` checks 100 emissions from the attributed Callahan gun
- `python3 experiments/verify-patterns.py` checks 100 cycles of periodic presets with periods up to 1,000
- `node experiments/build-standalone.js` rebuilds `patterns.js` and the portable HTML from `patterns.json`
- `node experiments/build-standalone.js --check` rejects stale generated browser bundles

State tests passed. The published page still needs browser smoke verification. The Python replay writes fresh certificate/progress outputs under ignored `experiments/results/gun-replay/`; it does not overwrite the included certificates.

## Attribution and other rules

The original app and rule are by this repository’s author. Presets clearly distinguish published examples from constructions found in this project. Paul Callahan’s gun is a reproduction in the different rule B2o/S2m34, not a new discovery. Hexagonal guns have published predecessors; no historical-first claim is made.

- [Callahan pattern and rule, LifeWiki forum](https://conwaylife.com/forums/viewtopic.php?p=176808)
- [Carter Bays, hexagonal and pentagonal cellular automata](https://www.complex-systems.com/abstracts/v15_i03_a04/)

Exact coordinates and provenance are stored in `patterns.json`; the adjusted-rule gun’s lookup table, seed, cut and endpoint appear in its independent certificate.

## Controls

Select an exact preset, then use Run/Pause, Step, +100, +1000, or the source's longer stage button. Click the stage button again to stop; resetting, editing cells, changing a preset, or changing the rule also cancels pending evolution. Space runs/pauses; Right Arrow steps; R resets; F fits. Keyboard shortcuts yield to focused form controls.

Click a hex to toggle it. Drag to pan, scroll or use +/− to zoom. Source view frames the saved source; Fit includes every live cell, including escaped output. The outside-view count makes retained offscreen cells explicit.

Changing rule controls makes a custom experiment unless it matches the same-seed Original/Discovery comparison. A finite-support engine cannot represent B0's infinite live background, so B0 is rejected. At more than 50,000 live cells, the UI pauses and keeps all cells.

## Reproducibility and scope

The repository remains dependency-free. `npm test` is the aggregate JavaScript check; `npm run verify:gun` independently reconstructs all 128 local rule cases and replays 29,436 generations in Python. See [the verification notes](verification.md) for the recurrence, separation argument, fixture provenance, and exact limits.

`patterns.json` is the editable preset source. Run the build command after changing it, the engine, or `lab.html`, and commit both generated browser files. The standalone file makes no network requests to start or simulate; clicking an attribution or original-app link opens that external page.

The original repository has no license file. This addition does not invent a project-wide license or relicense any attributed patterns.
