/**
 * Deals items into columns, each to the column that is currently shortest
 * (ties go left), the way Pinterest packs a feed.
 *
 * With equal heights this is plain round-robin, so the first row is still
 * items 0..n-1 in order and the newest listings read left to right across the
 * top. With real heights the columns end close together instead of the ragged
 * bottoms `i % n` leaves.
 *
 * Greedy and prefix-stable: packing the first k items gives exactly the first
 * k placements of packing them all. `MasonryRows` relies on that to pre-render
 * the first rows on the server and grow downward after hydration without
 * moving anything already on screen.
 *
 * Returns, for each column, the indexes of the items in it, top to bottom.
 */
export function packColumns(heights: number[], columns: number): number[][] {
  const stacks: number[][] = Array.from({ length: columns }, () => []);
  const filled = new Array<number>(columns).fill(0);
  heights.forEach((height, index) => {
    let target = 0;
    for (let column = 1; column < columns; column++) {
      if (filled[column] < filled[target]) target = column;
    }
    stacks[target].push(index);
    filled[target] += height;
  });
  return stacks;
}
