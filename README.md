Game of Life, but its hexagons instead.

The Rule:

$$
L_{t+1} =
\begin{cases}
\text{alive} & L_t \land n \in \{3,4\} \\
\text{alive} & \neg L_t \land n \in \{2,3\} \land A \land E \\
\text{dead} & \text{otherwise}
\end{cases}
$$

Where n is live-neighbor count, A means at least one adjacent live pair, and E means at least one adjacent empty pair.


See on https://garrettnorden20.github.io/hexagonal-game-of-life/

## Pattern laboratory

[Open the experimental simulator](https://garrettnorden20.github.io/hexagonal-game-of-life/experiments/lab.html) · [Download the self-contained HTML](https://github.com/garrettnorden20/hexagonal-game-of-life/raw/refs/heads/master/experiments/hex-life-lab.html)

The lab adds 62 exact presets, adjustable rules, an unbounded world, source/whole-world framing, and cancellable long-stage advances. The original app above and its default rule are unchanged.

Start with the verified 254-cell autonomous gun source, or its complete 245-cell precursor. It emits one p61 spaceship every 29,136 generations under **original + B4p + S6**, a different rule from the original. Published examples are attributed; historical novelty and global minimality are not claimed.

See [controls and reproduction](experiments/README.md) and the [verification notes](experiments/verification.md). No dependencies or build step are needed to open the lab. With Node.js 18+ and Python 3 installed, run:

```sh
npm test
npm run verify:patterns
npm run verify:gun
```

`npm test` includes complete physical circuit stages and can take a few minutes. The Python commands independently check periodic presets and the autonomous gun. Generated verification output stays under ignored `experiments/results/`.
