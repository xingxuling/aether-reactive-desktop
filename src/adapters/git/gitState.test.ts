import { mapProjectToTerrarium } from "./gitState";
import type { ProjectSnapshot } from "../../core/types";

const project: ProjectSnapshot = {
  path: "C:/demo",
  branch: "main",
  isGit: true,
  isDirty: true,
  commitCount: 40,
  latestCommit: "abc",
  latestCommitAt: new Date().toISOString(),
  changedFiles: 5,
  fileCount: 90,
  codeDirectories: ["src", "tests"],
  readAt: new Date().toISOString(),
  source: "demo",
};

describe("terrarium mapping", () => {
  it("turns project activity into bounded visual values", () => {
    const mapping = mapProjectToTerrarium(project);
    expect(mapping.vitality).toBeGreaterThan(0);
    expect(mapping.vitality).toBeLessThanOrEqual(1);
    expect(mapping.buildings).toBeGreaterThan(1);
    expect(mapping.disturbance).toBeGreaterThan(0);
    expect(mapping.sleep).toBe(false);
  });
});
