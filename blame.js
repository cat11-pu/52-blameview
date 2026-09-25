// blame.js：逐行归属。按提交顺序推进，同一位置的行内容与上一版相同则沿用原归属，
// 不同（或新增）则归属当前提交；最后把终态按位置对齐到 fileLines。
export function blame(commits, fileLines) {
  const unknown = [];
  const usable = [];
  commits.forEach((commit, index) => {
    if (!commit || commit.id == null || !Array.isArray(commit.lines)) {
      unknown.push(commit && commit.id != null ? commit.id : index);
    } else {
      usable.push(commit);
    }
  });
  let prevLines = [];
  let prevOwner = [];
  for (const commit of usable) {
    const lines = commit.lines;
    const owner = new Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
      owner[i] = i < prevLines.length && prevLines[i] === lines[i] ? prevOwner[i] : commit.id;
    }
    prevLines = lines;
    prevOwner = owner;
  }
  const owner = {};
  fileLines.forEach((line, index) => {
    owner[index] = index < prevLines.length && prevLines[index] === line ? prevOwner[index] : null;
  });
  return { owner: owner, unknown: unknown };
}
