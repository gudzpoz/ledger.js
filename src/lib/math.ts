export function circleInRect(
  x: number, y: number, r: number,
  rectWidth: number, rectHeight: number,
) {
  return x - r > 0 && y - r > 0 && x + r < rectWidth && y + r < rectHeight;
}

export function lesserAngleDelta(a1: number, a2: number) {
  const tau = 2 * Math.PI;
  const delta = (a1 - a2) % tau;
  if (delta <= -Math.PI) {
    return delta + tau;
  } else if (delta > Math.PI) {
    return delta - tau;
  }
  return delta;
}

export function positiveAngleDelta(a1: number, a2: number) {
  const delta = lesserAngleDelta(a1, a2);
  if (delta < 0) {
    return delta + 2 * Math.PI;
  }
  return delta;
}
