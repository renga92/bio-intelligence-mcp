// Mocking some of the environment
const companyAliases = {
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

async function fetchWithRetry(url) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
        ok: true,
        json: async () => ({ totalCount: 10 })
    };
}

// Current implementation logic
async function currentImplementation(focus) {
    const results = [];
    for (const [canonical, aliases] of Object.entries(companyAliases)) {
        let totalCount = 0;
        for (const alias of aliases) {
            let queryParts = [`query.spons=${encodeURIComponent(alias)}`];
            if (focus) queryParts.push(`query.cond=${encodeURIComponent(focus)}`);
            const query = queryParts.join("&");
            const url = `https://clinicaltrials.gov/api/v2/studies?${query}&countTotal=true&pageSize=1`;
            const res = await fetchWithRetry(url);
            if (!res.ok) continue;
            const data = await res.json();
            totalCount += data.totalCount || 0;
        }
        results.push({ company: canonical, count: totalCount });
    }
    return results;
}

// Optimized implementation logic (parallelizing all requests)
async function optimizedImplementation(focus) {
    const results = await Promise.all(
        Object.entries(companyAliases).map(async ([canonical, aliases]) => {
            const aliasResults = await Promise.all(aliases.map(async (alias) => {
                let queryParts = [`query.spons=${encodeURIComponent(alias)}`];
                if (focus) queryParts.push(`query.cond=${encodeURIComponent(focus)}`);
                const query = queryParts.join("&");
                const url = `https://clinicaltrials.gov/api/v2/studies?${query}&countTotal=true&pageSize=1`;
                const res = await fetchWithRetry(url);
                if (!res.ok) return 0;
                const data = await res.json();
                return data.totalCount || 0;
            }));
            const totalCount = aliasResults.reduce((sum, count) => sum + count, 0);
            return { company: canonical, count: totalCount };
        })
    );
    return results;
}

async function runBenchmark() {
    console.log("Starting benchmark...");

    const start1 = Date.now();
    await currentImplementation(undefined);
    const end1 = Date.now();
    console.log(`Current implementation: ${end1 - start1}ms`);

    const start2 = Date.now();
    await optimizedImplementation(undefined);
    const end2 = Date.now();
    console.log(`Optimized implementation: ${end2 - start2}ms`);
}

runBenchmark().catch(console.error);
