import type { ProjectSnapshot } from "../../core/types";

export interface TerrariumMapping {
  vitality: number;
  buildings: number;
  plants: number;
  disturbance: number;
  sleep: boolean;
}

export function mapProjectToTerrarium(project: ProjectSnapshot | null): TerrariumMapping {
  if (!project || !project.isGit) return { vitality: 0.16, buildings: 1, plants: 2, disturbance: 0, sleep: true };
  const recentActivity = project.latestCommitAt ? Math.max(0, 1 - (Date.now() - Date.parse(project.latestCommitAt)) / (1000 * 60 * 60 * 24 * 14)) : 0;
  const vitality = Math.min(1, 0.15 + recentActivity * 0.6 + Math.min(project.commitCount, 80) / 240 + Math.min(project.changedFiles, 24) / 160);
  return {
    vitality,
    buildings: Math.max(1, Math.min(9, Math.ceil(Math.log2(project.commitCount + 2)))),
    plants: Math.max(2, Math.min(18, Math.ceil(Math.sqrt(project.fileCount + project.changedFiles + 1)))),
    disturbance: project.isDirty ? Math.min(1, 0.25 + project.changedFiles / 36) : 0,
    sleep: recentActivity < 0.08 && project.changedFiles === 0,
  };
}

export function projectStatusLabel(project: ProjectSnapshot | null): string {
  if (!project) return "尚未绑定项目";
  if (!project.isGit) return "不是 Git 项目";
  return project.isDirty ? "工作区有变化" : "工作区整洁";
}
