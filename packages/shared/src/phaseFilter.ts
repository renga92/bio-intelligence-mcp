const PHASE_MAP: Record<string, string> = {
    PHASE1: "1",
    PHASE2: "2",
    PHASE3: "3",
    PHASE4: "4",
    NA: "0",
};

export function buildPhaseFilter(phases: string[]): string {
    const nums = phases
        .map(p => PHASE_MAP[p])
        .filter(Boolean)
        .join(" ");
    return nums ? `aggFilters=phase:${nums}` : "";
}
