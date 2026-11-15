export interface Room {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}
export interface Station {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  kind: string;
  system?: "power" | "oxygen" | "water" | "greenhouse" | "comms";
}
export const rooms: Room[] = [
  {
    id: "life",
    name: "SOPORTE VITAL",
    subtitle: "02 / ATMÓSFERA Y AGUA",
    x: 80,
    y: 130,
    w: 410,
    h: 300,
    color: 0x53c7d8,
  },
  {
    id: "control",
    name: "CENTRO DE CONTROL",
    subtitle: "01 / OPERACIONES",
    x: 560,
    y: 130,
    w: 410,
    h: 300,
    color: 0x8fb5db,
  },
  {
    id: "green",
    name: "INVERNADERO",
    subtitle: "03 / CULTIVOS",
    x: 1040,
    y: 130,
    w: 410,
    h: 300,
    color: 0x65c69a,
  },
  {
    id: "engine",
    name: "SALA DE MÁQUINAS",
    subtitle: "04 / SISTEMAS ELÉCTRICOS",
    x: 80,
    y: 570,
    w: 410,
    h: 300,
    color: 0xd8ad71,
  },
  {
    id: "lab",
    name: "LABORATORIO",
    subtitle: "05 / INVESTIGACIÓN",
    x: 560,
    y: 570,
    w: 410,
    h: 300,
    color: 0x9c9bd5,
  },
  {
    id: "shelter",
    name: "REFUGIO",
    subtitle: "06 / PROTECCIÓN",
    x: 1040,
    y: 570,
    w: 410,
    h: 300,
    color: 0xc5d1db,
  },
];
export const stations: Station[] = [
  {
    id: "oxygen",
    name: "Calibrador de oxígeno",
    room: "life",
    x: 190,
    y: 240,
    kind: "oxygen",
    system: "oxygen",
  },
  {
    id: "water",
    name: "Reciclador de agua",
    room: "life",
    x: 390,
    y: 240,
    kind: "water",
    system: "water",
  },
  {
    id: "control",
    name: "Terminal de operaciones",
    room: "control",
    x: 765,
    y: 240,
    kind: "control",
  },
  {
    id: "comms",
    name: "Enlace con la Tierra",
    room: "control",
    x: 880,
    y: 370,
    kind: "signal",
    system: "comms",
  },
  {
    id: "greenhouse",
    name: "Bancal hidropónico",
    room: "green",
    x: 1245,
    y: 245,
    kind: "greenhouse",
    system: "greenhouse",
  },
  {
    id: "power",
    name: "Banco de baterías",
    room: "engine",
    x: 215,
    y: 700,
    kind: "circuit",
    system: "power",
  },
  {
    id: "upgrade",
    name: "Regulador solar",
    room: "engine",
    x: 400,
    y: 700,
    kind: "upgrade",
  },
  {
    id: "research",
    name: "Analizador de muestras",
    room: "lab",
    x: 765,
    y: 750,
    kind: "research",
  },
  {
    id: "shelter",
    name: "Protocolo de refugio",
    room: "shelter",
    x: 1245,
    y: 750,
    kind: "shelter",
  },
];
export const walkable = [
  ...rooms.map((r) => ({ x: r.x + 14, y: r.y + 14, w: r.w - 28, h: r.h - 28 })),
  { x: 110, y: 465, w: 1310, h: 70 },
  ...rooms.map((r) => ({
    x: r.x + r.w / 2 - 36,
    y: r.y < 500 ? 390 : 505,
    w: 72,
    h: 110,
  })),
];
// Fixed equipment bays leave a central aisle at each lower-room entrance.
export const equipmentBays = rooms.flatMap((r) =>
  r.y < 500
    ? [{ x: r.x + 24, y: r.y + 58, w: r.w - 48, h: 48 }]
    : [
        { x: r.x + 24, y: r.y + 58, w: 140, h: 50 },
        { x: r.x + r.w - 164, y: r.y + 58, w: 140, h: 50 },
      ],
);
equipmentBays.push(
  { x: 1064, y: 340, w: 140, h: 52 },
  { x: 1286, y: 340, w: 140, h: 52 },
);
export function canWalk(x: number, y: number) {
  return (
    walkable.some(
      (r) =>
        x >= r.x + 10 &&
        x <= r.x + r.w - 10 &&
        y >= r.y + 10 &&
        y <= r.y + r.h - 10,
    ) &&
    !equipmentBays.some(
      (r) =>
        x > r.x - 8 && x < r.x + r.w + 8 && y > r.y - 8 && y < r.y + r.h + 8,
    ) &&
    !stations.some(
      (s) =>
        Math.abs(x - s.x) < (s.kind === "greenhouse" ? 105 : 48) &&
        Math.abs(y - s.y) < 32,
    )
  );
}
