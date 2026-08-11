import type { FusionSnapshot } from "../core/fusion-controller";
import type { LiquidGlassSettings, Point, Rect } from "../core/types";
import { fragmentShaderSource, vertexShaderSource } from "./shaders";

export interface MaterialNodeFrame {
  id: string;
  rect: Rect;
  pull: Point;
}

export interface MaterialFrame {
  nodes: readonly MaterialNodeFrame[];
  fusion: FusionSnapshot;
  settings: LiquidGlassSettings;
  width: number;
  height: number;
  time: number;
}

export interface MaterialRendererLike {
  render(frame: MaterialFrame): void;
  destroy(): void;
}

type Uniforms = {
  resolution: WebGLUniformLocation;
  rectA: WebGLUniformLocation;
  rectB: WebGLUniformLocation;
  radius: WebGLUniformLocation;
  material: WebGLUniformLocation;
  pair: WebGLUniformLocation;
  time: WebGLUniformLocation;
};

export class MaterialRenderer implements MaterialRendererLike {
  readonly supported: boolean;

  private readonly gl: WebGL2RenderingContext | null;
  private readonly program: WebGLProgram | null;
  private readonly buffer: WebGLBuffer | null;
  private readonly uniforms: Uniforms | null;
  private readonly pixelRatio: number;

  constructor(private readonly canvas: HTMLCanvasElement, quality: "low" | "medium" | "high" = "high") {
    const ratioLimit = quality === "high" ? 2 : quality === "medium" ? 1.5 : 1;
    this.pixelRatio = Math.min(ratioLimit, globalThis.devicePixelRatio || 1);
    this.gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });

    if (!this.gl) {
      this.supported = false;
      this.program = null;
      this.buffer = null;
      this.uniforms = null;
      canvas.dataset.liquidGlassFallback = "true";
      return;
    }

    try {
      this.program = this.createProgram();
      this.buffer = this.createBuffer();
      this.uniforms = this.findUniforms(this.program);
      this.supported = true;
      this.configurePipeline();
    } catch (error) {
      this.supported = false;
      this.program = null;
      this.buffer = null;
      this.uniforms = null;
      canvas.dataset.liquidGlassFallback = "true";
      canvas.dataset.liquidGlassError = error instanceof Error ? error.message : "WebGL initialization failed";
    }
  }

  render(frame: MaterialFrame): void {
    const gl = this.gl;
    if (!this.supported || !gl || !this.program || !this.uniforms) return;
    this.resize(frame.width, frame.height);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution, frame.width, frame.height);
    gl.uniform1f(this.uniforms.time, frame.time);
    gl.uniform4f(
      this.uniforms.material,
      frame.settings.bridgeStrength,
      frame.settings.viscosity,
      frame.fusion.readiness,
      frame.settings.impactResponse,
    );

    const pair = frame.fusion.pair;
    const joint = pair
      ? [frame.nodes.find((node) => node.id === pair[0]), frame.nodes.find((node) => node.id === pair[1])]
      : null;
    const jointIds = joint?.every(Boolean) ? new Set(pair) : null;

    for (const node of frame.nodes) {
      if (jointIds?.has(node.id)) continue;
      this.draw(node, null);
    }

    if (joint?.[0] && joint[1]) this.draw(joint[0], joint[1]);
  }

  destroy(): void {
    if (!this.gl) return;
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    if (this.program) this.gl.deleteProgram(this.program);
  }

  private draw(first: MaterialNodeFrame, second: MaterialNodeFrame | null): void {
    const gl = this.gl!;
    const uniforms = this.uniforms!;
    const a = toShaderRect(first.rect);
    const b = second ? toShaderRect(second.rect) : a;
    gl.uniform4f(uniforms.rectA, a.x, a.y, a.halfWidth, a.halfHeight);
    gl.uniform4f(uniforms.rectB, b.x, b.y, b.halfWidth, b.halfHeight);
    gl.uniform2f(uniforms.radius, first.rect.radius, second?.rect.radius ?? first.rect.radius);
    gl.uniform1f(uniforms.pair, second ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private resize(width: number, height: number): void {
    const pixelWidth = Math.max(1, Math.round(width * this.pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * this.pixelRatio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    this.gl?.uniform2f(this.uniforms!.resolution, width, height);
  }

  private configurePipeline(): void {
    const gl = this.gl!;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const position = gl.getAttribLocation(this.program!, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  private createBuffer(): WebGLBuffer {
    const gl = this.gl!;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Unable to allocate WebGL vertex buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    return buffer;
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl!;
    const vertex = this.compile(gl.VERTEX_SHADER, vertexShaderSource);
    const fragment = this.compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to allocate WebGL program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? "Unknown link error";
      gl.deleteProgram(program);
      throw new Error(`Liquid glass shader link failed: ${message}`);
    }
    return program;
  }

  private compile(type: number, source: string): WebGLShader {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to allocate WebGL shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) ?? "Unknown compile error";
      gl.deleteShader(shader);
      throw new Error(`Liquid glass shader compile failed: ${message}`);
    }
    return shader;
  }

  private findUniforms(program: WebGLProgram): Uniforms {
    const gl = this.gl!;
    const required = (name: string): WebGLUniformLocation => {
      const location = gl.getUniformLocation(program, name);
      if (!location) throw new Error(`Missing shader uniform ${name}`);
      return location;
    };
    return {
      resolution: required("u_resolution"),
      rectA: required("u_rect_a"),
      rectB: required("u_rect_b"),
      radius: required("u_radius"),
      material: required("u_material"),
      pair: required("u_pair"),
      time: required("u_time"),
    };
  }
}

function toShaderRect(rect: Rect): { x: number; y: number; halfWidth: number; halfHeight: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    halfWidth: rect.width / 2,
    halfHeight: rect.height / 2,
  };
}
