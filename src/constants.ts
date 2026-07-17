/** 病种预设列表（用于准备页下拉选择） */
export const CASE_PRESETS = [
  "AF",
  "AAFL",
  "AFL",
  "AVRT",
  "WPW",
  "PVC",
] as const;

/** 默认病种名称（新建场次时占位，用户可在准备页改为预设） */
export function defaultCaseNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `病例${i + 1}`);
}
