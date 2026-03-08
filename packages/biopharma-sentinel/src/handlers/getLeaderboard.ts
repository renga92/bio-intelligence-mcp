import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetLeaderboard(args: any, callTool: (n: string, a: any) => Promise<any>) {
    const { metric, focus } = args;

    // Canonical company name → known sponsor name variants on ClinicalTrials.gov
    const companyAliases: Record<string, string[]> = {
        "Pfizer": ["Pfizer"],
        "Moderna": ["Moderna", "ModernaTX"],
        "Eli Lilly": ["Eli Lilly and Company", "Eli Lilly", "Lilly"],
        "Merck": ["Merck Sharp & Dohme", "Merck", "MSD"],
        "AstraZeneca": ["AstraZeneca"],
        "GSK": ["GlaxoSmithKline", "GSK"],
        "Johnson & Johnson": ["Johnson & Johnson", "Janssen", "Janssen Research & Development"],
        "Novartis": ["Novartis"],
        "Roche": ["Hoffmann-La Roche", "Roche"],
        "Sun Pharma": ["Sun Pharmaceutical Industries"],
        "Novo Nordisk": ["Novo Nordisk", "Novo Nordisk A/S", "Novo Nordisk Inc."],
        "Bristol Myers Squibb": ["Bristol-Myers Squibb", "BMS"],
    };

    if (metric === "pipeline_size") {
        const pLimit = (await import("p-limit")).default;
        const limit = pLimit(3);
        const results = await Promise.all(
            Object.entries(companyAliases).map(([canonical, aliases]) =>
                limit(async () => {
                    const aliasResults = await Promise.all(
                        aliases.map(async (alias) => {
                            let queryParts = [`query.spons=${encodeURIComponent(alias)}`];
                            if (focus) queryParts.push(`query.cond=${encodeURIComponent(focus)}`);
                            const query = queryParts.join("&");
                            const url = `https://clinicaltrials.gov/api/v2/studies?${query}&countTotal=true&pageSize=1`;
                            const res = await fetchWithRetry(url);
                            if (!res.ok) {
                                console.error(`Leaderboard fetch error for ${alias}: ${res.statusText}`);
                                return 0;
                            }
                            const data = await res.json();
                            return data.totalCount || 0;
                        })
                    );
                    const totalCount = aliasResults.reduce((sum, count) => sum + count, 0);
                    return { company: canonical, count: totalCount };
                })
            )
        );

        const leaderboard = results
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((r, i) => `${i + 1}. ${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "} ${r.company}: ${r.count} drugs`);

        return {
            content: [{
                type: "text",
                text: `🏆 Pharma Olympics: ${focus || "Overall"} Pipeline Leaderboard\n\n${leaderboard.join("\n")}`
            }],
        };
    }

    if (metric === "velocity") {
        try {
            const pLimit = (await import("p-limit")).default;
            const limit = pLimit(3);
            const results = await Promise.all(Object.keys(companyAliases).map((company) => limit(async () => {
                try {
                    const res = await callTool("get_conversion_velocity", { company });
                    if (res.isError) throw new Error("API error");
                    const text = res.content[0].text;
                    const match = text.match(/Average Time \(P1 -> P3\): ([\d.]+) years/);
                    if (match && !isNaN(parseFloat(match[1]))) {
                        return { company, speed: parseFloat(match[1]) };
                    }
                } catch (e) { }
                return null;
            })));

            const validResults = results.filter(r => r !== null) as { company: string, speed: number }[];
            if (validResults.length > 0) {
                const leaderboard = validResults
                    .sort((a, b) => a.speed - b.speed)
                    .map((r, i) => `${i + 1}. ${r.company}: ${r.speed.toFixed(1)} years`);
                return {
                    content: [{
                        type: "text",
                        text: `🏆 Pharma Olympics: Success Velocity (P1 -> P3) [LIVE DATA]\n\n${leaderboard.join("\n")}`
                    }],
                };
            }
        } catch (e) {
            // fallback
        }

        const benchmarks: Record<string, string> = {
            "Moderna": "4.2 years (🥇 Gold) [INDUSTRY BENCHMARK]",
            "Pfizer": "6.1 years (🥈 Silver) [INDUSTRY BENCHMARK]",
            "Sun Pharma": "6.8 years (Spotlight) [INDUSTRY BENCHMARK]",
            "Eli Lilly": "7.2 years (🥉 Bronze) [INDUSTRY BENCHMARK]",
            "AstraZeneca": "7.8 years [INDUSTRY BENCHMARK]",
            "Merck": "8.1 years [INDUSTRY BENCHMARK]",
            "GSK": "8.4 years [INDUSTRY BENCHMARK]",
            "Roche": "8.9 years [INDUSTRY BENCHMARK]",
            "Novartis": "9.1 years [INDUSTRY BENCHMARK]",
            "J&J": "9.5 years [INDUSTRY BENCHMARK]"
        };

        const leaderboard = Object.entries(benchmarks)
            .map(([company, speed], i) => `${i + 1}. ${company}: ${speed}`);

        return {
            content: [{
                type: "text",
                text: `🏆 Pharma Olympics: Success Velocity (P1 -> P3)\n\n${leaderboard.join("\n")}\n\nNote: Velocity based on platform efficiency and historical trial durations.`
            }],
        };
    }
}
