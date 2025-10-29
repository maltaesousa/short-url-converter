type Point = [number, number];

interface Circle {
  center: Point;
  radius: number;
}

export function approximateCircle(coords: Point[]): Circle {
  // Approximate center as the average of the points
  const cx = coords.reduce((s, [x]) => s + x, 0) / coords.length;
  const cy = coords.reduce((s, [, y]) => s + y, 0) / coords.length;

  // Average radius
  const radius = coords.reduce((s, [x, y]) => s + Math.hypot(x - cx, y - cy), 0) / coords.length;

  return { center: [cx, cy], radius };
}
