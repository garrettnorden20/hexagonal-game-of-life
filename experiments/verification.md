# Verification notes

## Exact rule and coordinates

All experiments use binary cells on integer axial coordinates with cyclic neighbor offsets `(1,0), (1,-1), (0,-1), (-1,0), (-1,1), (0,1)`. Evolution is synchronous. The sparse universe is unbounded; drawing never clips the simulation.

The original rule survives with three or four neighbors. A dead cell is born with two or three neighbors only when the ring contains both an adjacent live pair and an adjacent empty pair. The new gun uses this original birth rule plus B4p (four occupied positions whose two empty positions are opposite), and survives at three, four, or six neighbors. This is written B2o3om4p/S346H in the research presets.

The Node checks exhaust all 128 center-plus-neighbor states for the original rule, Callahan's rule, and the adjusted gun rule. They also compare the original `game.js` step function against the sparse engine on 100 deterministic bounded boards for 20 generations each. No original app source or rule was changed.

## The 245/254-cell autonomous gun

The [included independent certificate](ongoing/results/factory-feedback-order3-gun29136-independent.json) contains the full precursor, cycle cut, emitted object, endpoint, lookup bits, and SHA-256 digests. The [candidate input](ongoing/results/factory-feedback-order3-gun29136-candidate.json) is the frozen input to the verifier.

1. Evolve the complete 245-cell finite seed for 300 generations. It equals the saved 254-cell source C exactly.
2. Evolve every cell for another P = 29,136 generations. The complete field is exactly the disjoint union C ∪ O, with 277 live cells: the restored source and a 23-cell phase of the emitted spaceship. Nothing is injected, erased, cropped, recentered, or restarted.
3. Independently evolve O for 61 generations. It is exactly O translated by (-3,-1). The 61 phases can change population; “p61” is the moving orbit period, not the source's emission interval.
4. Compare an older output with every one of the 29,137 fresh-cycle states using axial r. The smallest separating coordinate gap is 239, greater than the radius-one interaction bound of 2. Every further old output lies farther along negative r. The all-phase lower bound between consecutive old outputs is 462, also greater than 2.

Locality then gives the same fresh source cycle plus independently moving older outputs at every later cycle. This is a finite recurrence and permanent-separation certificate for indefinite emission, rather than extrapolation from population growth. It does not establish historical priority, a globally smallest gun, or a gun in the unchanged original rule.

Run from the repository root, using Python's standard library only:

```sh
python3 experiments/ongoing/factory-feedback-order3-gun29136-independent.py
```

A fresh replay writes under `experiments/results/gun-replay/`. Use `--output-dir PATH` to choose another directory. Compare its seed/cut/endpoint/output hashes and separation bounds with the included certificate; elapsed runtime naturally differs. The saved r-envelope is also reproducible byte-for-byte.

## Simulator regressions

`npm test` validates generated files, all 62 preset loads, rule validation, same-seed rule switching, edit/reset, run/pause, camera controls, cancellation and stale-timer isolation. It physically advances the new gun's entire 29,136-step cycle and its precursor stage, two older 17,000-step gun stages, and the two large closed-oscillator stages. It checks complete coordinate sets against frozen reference states and verifies that escaped output remains simulated. Canvas calls are stubbed in these tests: they verify event/state behavior, not pixels.

The fixtures in `fixtures/` contain only the exact stages used by these tests. Their manifest records their own hashes and the hash of the complete source dataset from which they were selected. They are intentionally not presented as complete visualization traces. The three converter fixtures likewise preserve only the referenced case and record the original dataset hash. Other included certificates document earlier verified milestones; only the fast gun has its full independent replay script in this compact publication.

## Other presets and attribution

- `node experiments/verify-gun.js` verifies the attributed Paul Callahan gun for 4,200 generations / 100 emissions. At every boundary the complete state equals the original core plus every independently evolved output
- `python3 experiments/verify-patterns.py` checks 100 cycles and the first translation recurrence for periodic presets with periods up to 1,000; use `--id PRESET_ID --cycles N` for a selected periodic preset
- Logic, memory, filters, reflectors and externally triggered converters are interaction demonstrations, not autonomous guns or a universality claim. Their preset descriptions state timing and supplied-input limitations; the short periodic sweep intentionally excludes them
- The original-rule wick is a growing strip, not a stream of detached spaceships

Published examples are credited to [Paul Callahan](https://conwaylife.com/forums/viewtopic.php?p=176808) and [Carter Bays](https://www.complex-systems.com/abstracts/v15_i03_a04/). Exact per-preset provenance is in `patterns.json`. A pattern encountered in this project's search is not thereby historically new.
