import { signedRectGap } from "./geometry";
import type { GlassNode, LiquidGlassSettings } from "./types";

export type FusionPhase = "disabled" | "idle" | "pulling" | "preparing" | "fused" | "returning";

export interface FusionFrame {
  activeId: string | null;
  returning: boolean;
  nodes: readonly GlassNode[];
  settings: LiquidGlassSettings;
}

export interface FusionSnapshot {
  phase: FusionPhase;
  pair: readonly [string, string] | null;
  edgeGap: number;
  readiness: number;
}

const idleSnapshot = (phase: FusionPhase): FusionSnapshot => ({
  phase,
  pair: null,
  edgeGap: Number.POSITIVE_INFINITY,
  readiness: 0,
});

export class FusionController {
  private targetId: string | null = null;
  private lastSnapshot: FusionSnapshot = idleSnapshot("disabled");

  get snapshot(): FusionSnapshot {
    return this.lastSnapshot;
  }

  update(frame: FusionFrame): FusionSnapshot {
    if (!frame.settings.fusionEnabled) {
      return this.setIdle("disabled");
    }

    if (!frame.activeId) {
      return this.setIdle(frame.returning ? "returning" : "idle");
    }

    const active = frame.nodes.find((node) => node.id === frame.activeId);
    if (!active?.fusion) return this.setIdle("disabled");

    const candidates = frame.nodes
      .filter((node) => node.id !== active.id && node.fusion)
      .map((node) => ({ node, gap: signedRectGap(active, node) }))
      .sort((left, right) => left.gap - right.gap);

    if (candidates.length === 0) {
      this.targetId = null;
      return this.set({
        phase: "pulling",
        pair: null,
        edgeGap: Number.POSITIVE_INFINITY,
        readiness: 0,
      });
    }

    const nearest = candidates[0]!;
    const current = candidates.find((candidate) => candidate.node.id === this.targetId);
    const chosen = current && current.gap <= nearest.gap + 6 ? current : nearest;
    this.targetId = chosen.node.id;

    if (chosen.gap > frame.settings.prepareDistance) {
      this.targetId = null;
      return this.set({ phase: "pulling", pair: null, edgeGap: chosen.gap, readiness: 0 });
    }

    const range = Math.max(1, frame.settings.prepareDistance - frame.settings.contactDistance);
    const readiness = Math.min(1, Math.max(0, (frame.settings.prepareDistance - chosen.gap) / range));
    const phase: FusionPhase = chosen.gap <= frame.settings.contactDistance ? "fused" : "preparing";

    return this.set({
      phase,
      pair: [active.id, chosen.node.id],
      edgeGap: chosen.gap,
      readiness,
    });
  }

  reset(): FusionSnapshot {
    return this.setIdle("idle");
  }

  private setIdle(phase: FusionPhase): FusionSnapshot {
    this.targetId = null;
    return this.set(idleSnapshot(phase));
  }

  private set(snapshot: FusionSnapshot): FusionSnapshot {
    this.lastSnapshot = snapshot;
    return snapshot;
  }
}
