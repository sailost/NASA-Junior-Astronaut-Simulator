/** Offscreen art QA adapter. Runs production drawing routines without browser UI or a GPU.
 * It is not a browser screenshot and does not emulate Phaser's rendering pipeline. */
import { createCanvas, type SKRSContext2D, type Canvas } from "@napi-rs/canvas";
const color = (value: number, alpha = 1) =>
  `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
type Paint = (context: SKRSContext2D) => void;
export class ArtNode {
  x = 0;
  y = 0;
  rotation = 0;
  tilePositionX = 0;
  tilePositionY = 0;
  crop?: { x: number; y: number; w: number; h: number };
  scaleX = 1;
  scaleY = 1;
  alpha = 1;
  depth = 0;
  visible = true;
  originX = 0.5;
  originY = 0.5;
  parent = false;
  fill = 0;
  fillAlpha = 1;
  stroke = 0;
  strokeWidth = 0;
  strokeAlpha = 1;
  w = 0;
  h = 0;
  tint = 0xffffff;
  text = "";
  style: any = {};
  children: ArtNode[] = [];
  commands: Paint[] = [];
  private fillPaint = "white";
  private strokePaint = "white";
  private lineWidth = 1;
  constructor(
    public kind: string,
    public key = "",
  ) {}
  setDepth(value: number) {
    this.depth = value;
    return this;
  }
  setOrigin(x: number, y = x) {
    this.originX = x;
    this.originY = y;
    return this;
  }
  setAlpha(value: number) {
    this.alpha = value;
    return this;
  }
  setVisible(value: boolean) {
    this.visible = value;
    return this;
  }
  setScale(x: number, y = x) {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setDisplaySize(w: number, h: number) {
    this.w = w;
    this.h = h;
    return this;
  }
  setTint(value: number) {
    this.tint = value;
    return this;
  }
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  setRotation(angle: number) { this.rotation = angle; return this; }
  setCrop(x: number, y: number, w: number, h: number) { this.crop = { x, y, w, h }; return this; }
  setText(value: string) {
    this.text = value;
    return this;
  }
  setFillStyle(value: number, alpha = 1) {
    this.fill = value;
    this.fillAlpha = alpha;
    return this;
  }
  setStrokeStyle(width: number, value: number, alpha = 1) {
    this.strokeWidth = width;
    this.stroke = value;
    this.strokeAlpha = alpha;
    return this;
  }
  destroy() {
    this.visible = false;
  }
  fillStyle(value: number, alpha = 1) {
    this.fillPaint = color(value, alpha);
    return this;
  }
  lineStyle(width: number, value: number, alpha = 1) {
    this.lineWidth = width;
    this.strokePaint = color(value, alpha);
    return this;
  }
  private shape(path: (c: SKRSContext2D) => void, stroke = false) {
    const paint = stroke ? this.strokePaint : this.fillPaint,
      width = this.lineWidth;
    this.commands.push((c) => {
      c.beginPath();
      path(c);
      if (stroke) {
        c.strokeStyle = paint;
        c.lineWidth = width;
        c.stroke();
      } else {
        c.fillStyle = paint;
        c.fill();
      }
    });
    return this;
  }
  fillRect(x: number, y: number, w: number, h: number) {
    return this.shape((c) => c.rect(x, y, w, h));
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    return this.shape((c) => c.roundRect(x, y, w, h, r));
  }
  strokeRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    return this.shape((c) => c.roundRect(x, y, w, h, r), true);
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    return this.shape((c) => c.rect(x, y, w, h), true);
  }
  fillCircle(x: number, y: number, r: number) {
    return this.shape((c) => c.arc(x, y, r, 0, Math.PI * 2));
  }
  strokeCircle(x: number, y: number, r: number) {
    return this.shape((c) => c.arc(x, y, r, 0, Math.PI * 2), true);
  }
  fillEllipse(x: number, y: number, w: number, h: number) {
    return this.shape((c) => c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2));
  }
  strokeEllipse(x: number, y: number, w: number, h: number) {
    return this.shape(
      (c) => c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2),
      true,
    );
  }
  lineBetween(x: number, y: number, x2: number, y2: number) {
    return this.shape((c) => {
      c.moveTo(x, y);
      c.lineTo(x2, y2);
    }, true);
  }
  strokePoints(points: { x: number; y: number }[], closed = false) {
    return this.shape((c) => {
      points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      if (closed) c.closePath();
    }, true);
  }
  fillTriangle(
    x: number,
    y: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) {
    return this.shape((c) => {
      c.moveTo(x, y);
      c.lineTo(x2, y2);
      c.lineTo(x3, y3);
      c.closePath();
    });
  }
  clear() {
    this.commands = [];
    return this;
  }
}
export function artScene(cacheStatic = false) {
  const textures = new Map<string, Canvas>(),
    nodes: ArtNode[] = [];
  const add = (
    kind: string,
    x = 0,
    y = 0,
    w = 0,
    h = 0,
    fill = 0,
    alpha = 1,
  ) => {
    const n = new ArtNode(kind);
    Object.assign(n, { x, y, w, h, fill, fillAlpha: alpha });
    nodes.push(n);
    return n;
  };
  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      get: (key: string) => ({ getSourceImage: () => textures.get(key)! }),
      createCanvas(key: string, w: number, h: number) {
        const canvas = createCanvas(w, h);
        textures.set(key, canvas);
        return { context: canvas.getContext("2d"), refresh() {} };
      },
    },
    add: {
      graphics: () => {
        const node = add("graphics");
        if (cacheStatic) Object.assign(node, {
          generateTexture(key: string, width: number, height: number) {
            const canvas = createCanvas(width, height);
            const context = canvas.getContext("2d");
            node.commands.forEach((command) => command(context));
            textures.set(key, canvas);
            return node;
          },
        });
        return node;
      },
      rectangle: (
        x: number,
        y: number,
        w: number,
        h: number,
        fill: number,
        alpha = 1,
      ) => add("rectangle", x, y, w, h, fill, alpha),
      ellipse: (
        x: number,
        y: number,
        w: number,
        h: number,
        fill: number,
        alpha = 1,
      ) => add("ellipse", x, y, w, h, fill, alpha),
      circle: (x: number, y: number, r: number, fill: number, alpha = 1) =>
        add("ellipse", x, y, r * 2, r * 2, fill, alpha),
      image: (x: number, y: number, key: string) => {
        const n = add("image", x, y);
        n.key = key;
        const texture = textures.get(key);
        if (texture) { n.w = texture.width; n.h = texture.height; }
        return n;
      },
      tileSprite: (x: number, y: number, w: number, h: number, key: string) => {
        const n = add("tile", x, y, w, h);
        n.key = key;
        return n;
      },
      text: (x: number, y: number, text: string, style: any) => {
        const n = add("text", x, y);
        Object.assign(n, { text, style, originX: 0, originY: 0 });
        return n;
      },
      container: (x: number, y: number, children: ArtNode[]) => {
        children.forEach((n) => (n.parent = true));
        const n = add("container", x, y);
        n.children = children;
        return n;
      },
    },
    tweens: { add() {} },
  };
  const draw = (c: SKRSContext2D, n: ArtNode) => {
    if (!n.visible || n.alpha <= 0) return;
    c.save();
    c.translate(n.x, n.y);
    c.rotate(n.rotation);
    c.scale(n.scaleX, n.scaleY);
    c.globalAlpha *= n.alpha;
    if (n.kind === "graphics") n.commands.forEach((command) => command(c));
    if (n.kind === "container") n.children.forEach((child) => draw(c, child));
    if (n.kind === "rectangle" || n.kind === "ellipse") {
      c.beginPath();
      if (n.kind === "rectangle")
        c.rect(-n.w * n.originX, -n.h * n.originY, n.w, n.h);
      else c.ellipse(0, 0, n.w / 2, n.h / 2, 0, 0, Math.PI * 2);
      c.fillStyle = color(n.fill, n.fillAlpha);
      c.fill();
      if (n.strokeWidth) {
        c.strokeStyle = color(n.stroke, n.strokeAlpha);
        c.lineWidth = n.strokeWidth;
        c.stroke();
      }
    }
    if (n.kind === "image" || n.kind === "tile") {
      const texture = textures.get(n.key);
      if (texture) {
        if (n.crop) {
          c.beginPath();
          c.rect(-n.w * n.originX + n.crop.x * n.w / texture.width, -n.h * n.originY + n.crop.y * n.h / texture.height, n.crop.w * n.w / texture.width, n.crop.h * n.h / texture.height);
          c.clip();
        }
        if (n.kind === "tile") {
          const pattern = c.createPattern(texture, "repeat")!;
          pattern.setTransform({ a: 1, b: 0, c: 0, d: 1, e: -n.tilePositionX, f: -n.tilePositionY });
          c.fillStyle = pattern;
          c.fillRect(-n.w * n.originX, -n.h * n.originY, n.w, n.h);
        } else {
          if (n.tint === 0xffffff) {
            c.drawImage(texture, -n.w * n.originX, -n.h * n.originY, n.w, n.h);
            c.restore();
            return;
          }
          const tint = createCanvas(texture.width, texture.height),
            tc = tint.getContext("2d");
          tc.drawImage(texture, 0, 0);
          tc.globalCompositeOperation = "source-in";
          tc.fillStyle = color(n.tint);
          tc.fillRect(0, 0, tint.width, tint.height);
          c.drawImage(tint, -n.w * n.originX, -n.h * n.originY, n.w, n.h);
        }
      }
    }
    if (n.kind === "text") {
      c.font = `${n.style.fontStyle || ""} ${n.style.fontSize || "12px"} Arial`;
      c.fillStyle = n.style.color || "#fff";
      c.textBaseline = "top";
      c.fillText(n.text, 0, 0);
    }
    c.restore();
  };
  return {
    scene,
    nodes,
    textures,
    render(
      width: number,
      height: number,
      camera: { x: number; y: number; zoom: number },
    ) {
      const canvas = createCanvas(width, height),
        c = canvas.getContext("2d");
      c.fillStyle = "#8d6754";
      c.fillRect(0, 0, width, height);
      c.scale(camera.zoom, camera.zoom);
      c.translate(-camera.x, -camera.y);
      [...nodes]
        .filter((n) => !n.parent)
        .sort((a, b) => a.depth - b.depth)
        .forEach((n) => draw(c, n));
      return canvas;
    },
  };
}
