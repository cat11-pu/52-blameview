// moves.js：移动检测与增量（基线：不检测移动、整份重算）
import { blame } from "./blame.js";

export function incremental(commits, fileLines, knownMoves, from) {
  const full = blame(commits, fileLines);
  return { owner: full.owner, moved: [], reblamed: fileLines.map((line, index) => index) };
}
