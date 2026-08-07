import type { ProjectSnapshot, WorldState } from "../../core/types";

export interface ExternalRealityProvider {
  readonly id: string;
  getRealityLabel(): Promise<string>;
}

export interface SubjectProvider {
  readonly id: string;
  getSubjectLabel(): Promise<string>;
}

export interface ProjectWorldProvider {
  readonly id: string;
  readProject(path: string): Promise<ProjectSnapshot>;
}

export interface TreeSpiritProvider {
  readonly id: string;
  getSpiritMessage(): Promise<string>;
}

export interface WorldSimulationProvider {
  readonly id: string;
  loadWorld(): Promise<WorldState>;
}

export const LocalProvider = {
  id: "local",
  async getRealityLabel() { return "本地环境"; },
  async getSubjectLabel() { return "访客"; },
  async getSpiritMessage() { return "我只展示环境，不替你定义自己。"; },
};
