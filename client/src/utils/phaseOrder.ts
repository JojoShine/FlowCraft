export const CANONICAL_PHASES = [
  '项目线索',
  '调研梳理',
  '方案设计',
  '原型设计',
  '开发实施',
  '测试交付',
  '复盘归档',
] as const;

const phaseOrderIndex = new Map<string, number>(CANONICAL_PHASES.map((name, i) => [name, i]));

export function sortByCanonicalOrder<T extends { name: string }>(phases: T[]): T[] {
  return [...phases].sort((a, b) => {
    const ai = phaseOrderIndex.get(a.name) ?? Infinity;
    const bi = phaseOrderIndex.get(b.name) ?? Infinity;
    return ai - bi;
  });
}
