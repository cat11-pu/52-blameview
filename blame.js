// blame.js：逐行归属（基线：所有行都算最后一次提交）
export function blame(commits, fileLines) {
  const owner = {};
  fileLines.forEach((line, index) => { owner[index] = commits.length ? commits[commits.length - 1].id : null; });
  return { owner: owner, unknown: [] };
}
