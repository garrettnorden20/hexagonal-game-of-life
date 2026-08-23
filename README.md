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
