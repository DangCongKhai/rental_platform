export function seedId(kind: number, n: number): string {
  return `01900000-0000-7000-${kind.toString(16).padStart(4, "0")}-${n.toString(16).padStart(12, "0")}`;
}

export const seedPeople = [
  { n: 1, email: "admin@rentos.local", name: "An", phone: "0901000001", admin: true, avatar: "https://example.com/seed/an.png" },
  { n: 2, email: "linh@rentos.local", name: "Linh", phone: "0901000002", admin: false, avatar: "https://example.com/seed/linh.png" },
  { n: 3, email: "hao@rentos.local", name: "Hao", phone: "0901000003", admin: false, avatar: "https://example.com/seed/hao.png" },
  { n: 4, email: "mai@rentos.local", name: "Mai", phone: "0901000004", admin: false, avatar: "https://example.com/seed/mai.png" },
  { n: 5, email: "lan@rentos.local", name: "Lan", phone: "0901000005", admin: false, avatar: "https://example.com/seed/lan.png" },
] as const;

export const linhId = seedId(2, 2);
export const haoId = seedId(2, 3);
export const maiId = seedId(2, 4);
export const lanId = seedId(2, 5);
export const adminId = seedId(2, 1);
