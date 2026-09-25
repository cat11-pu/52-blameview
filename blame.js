// blame.js：逐行归属（按提交顺序一次推进：与上一版不同的行归属当前提交，相同的行沿用原归属）
export function blame(commits, fileLines) {
  const unknown = [];
  let prevLines = [];
  let current = {};
  commits.forEach((commit, index) => {
    if (!commit || typeof commit.id !== "string") { unknown.push(index); return; }
    const lines = Array.isArray(commit.lines) ? commit.lines : [];
    const next = {};
    for (let i = 0; i < lines.length; i++) {
      next[i] = i < prevLines.length && prevLines[i] === lines[i] ? current[i] : commit.id;
    }
    prevLines = lines;
    current = next;
  });
  const owner = {};
  for (let i = 0; i < fileLines.length; i++) {
    owner[i] = i < prevLines.length && prevLines[i] === fileLines[i] && current[i] !== undefined ? current[i] : null;
  }
  return { owner: owner, unknown: unknown };
}
