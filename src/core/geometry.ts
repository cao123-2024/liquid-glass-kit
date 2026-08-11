import type { GlassNode, Point, Rect } from "./types";

export function presentedRect(node: GlassNode): Rect {
  return {
    ...node.rect,
    x: node.rect.x + node.pull.x,
    y: node.rect.y + node.pull.y,
  };
}

export function signedRectGap(first: GlassNode, second: GlassNode): number {
  const a = presentedRect(first);
  const b = presentedRect(second);
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;
  const gapX = Math.max(b.x - aRight, a.x - bRight, 0);
  const gapY = Math.max(b.y - aBottom, a.y - bBottom, 0);

  if (gapX > 0 || gapY > 0) return Math.hypot(gapX, gapY);

  const overlapX = Math.min(aRight, bRight) - Math.max(a.x, b.x);
  const overlapY = Math.min(aBottom, bBottom) - Math.max(a.y, b.y);
  return -Math.min(overlapX, overlapY);
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function directionBetween(first: GlassNode, second: GlassNode): Point {
  const a = rectCenter(presentedRect(first));
  const b = rectCenter(presentedRect(second));
  const x = b.x - a.x;
  const y = b.y - a.y;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
