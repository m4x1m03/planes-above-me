export const VIEWS = ['map', 'radar', 'dome'] as const;
export type View = (typeof VIEWS)[number];