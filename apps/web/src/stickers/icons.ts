import { VIEWS, line, poly, rect, spark } from "./fun";
import { hop, twinkle } from "./motions";
import type { Icon, Layer } from "./fun";

const { tilt: FACE, extrude: EXT } = VIEWS.right;
const SHIELD = "M-100-120 0-150 100-120 92 10C84 76 34 126 0 146-34 126-84 76-92 10Z";
const glint = (parent: string, p: readonly [number, number], m: ReturnType<typeof twinkle>): Layer => ({ parent, a: p, p, m, shapes: [{ d: spark(p[0], p[1], 24), fill: "white" }] });
export const proofShield: Icon = {
  name: "Verified proof shield",
  frames: 180,
  line: 5,
  extrude: EXT,
  still: 100,
  layers: [
    { id: "shield", p: [250, 258], m: hop, shapes: [] },
    { parent: "shield", tilt: FACE, shapes: [
      { d: poly([[-112, -134], [112, -134], [112, 116], [-112, 116]], [16, 16, 16, 16]), fill: "deep", depth: 1 },
      { d: SHIELD, fill: "main", depth: 1, edges: [[0, 146]] },
      { d: line([-48, 4], [-10, 42]) },
      { d: line([-10, 42], [56, -36]) },
      { d: rect(-60, 118, 120, 30, 8), fill: "ok", depth: .6 }
    ] },
    glint("shield", [134, -126], twinkle(0, true)),
    glint("shield", [134, -126], twinkle(60)),
    glint("shield", [-138, 30], twinkle(6, true)),
    glint("shield", [-138, 30], twinkle(66))
  ]
};
