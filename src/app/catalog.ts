import type { ToyId } from "../core/types";

export interface ToyDefinition {
  id: ToyId;
  name: string;
  chineseName: string;
  tagline: string;
  hint: string;
  glyph: string;
  tone: string;
}

export const TOYS: ToyDefinition[] = [
  { id: "dynamic-cover", name: "Dynamic Cover", chineseName: "以太动态封面", tagline: "让桌面随昼夜呼吸。", hint: "时间 · 主题 · 流场", glyph: "◌", tone: "blue" },
  { id: "music-halo", name: "Music Halo", chineseName: "音乐光环", tagline: "把声音变成光。", hint: "本地音频 · 频谱", glyph: "∿", tone: "gold" },
  { id: "project-terrarium", name: "Project Terrarium", chineseName: "项目生态缸", tagline: "看见项目活动长成世界。", hint: "只读 Git · 生长", glyph: "⌂", tone: "mint" },
  { id: "tree-spirit", name: "TreeSpirit", chineseName: "树精灵桌宠", tagline: "桌面上有一位小小观察者。", hint: "活跃 · 睡眠 · 果实", glyph: "✦", tone: "violet" },
  { id: "pocket-world", name: "Pocket World", chineseName: "桌面微型持续世界", tagline: "一个会继续存在的小地方。", hint: "确定性种子 · 保存", glyph: "◇", tone: "coral" },
];

export function getToy(id: ToyId): ToyDefinition {
  return TOYS.find((toy) => toy.id === id) ?? TOYS[0];
}
