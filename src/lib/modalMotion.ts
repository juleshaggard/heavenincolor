export function curveSwipePath(edgeY = 100, controlY = edgeY): string {
  return `M 0 100 V ${edgeY} Q 50 ${controlY} 100 ${edgeY} V 100 Z`;
}
