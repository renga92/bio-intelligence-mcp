import { fetchWithRetry } from "@biopharma/shared";

const SEC_USER_AGENT = "BioPharma-Sentinel research@biopharma.ai";

// Hardcoded CIK lookup for major pharma companies (bypasses API lookup latency)
const KNOWN_CIKS: Record<string, string> = {
    "Eli Lilly": "0000059478",
    "Lilly": "0000059478",
    "Pfizer": "0000078003",
    "Moderna": "0001682852",
    "Merck": "0000310158",
    "AstraZeneca": "0000901832",
    "Novartis": "0001114448",
    "Johnson & Johnson": "0000200406",
    "Bristol Myers Squibb": "0000014272",
    "Amgen": "0000318154",
    "Gilead": "0000882095",
    "Regeneron": "0000872589",
    "Biogen": "0000875320",
    "Vertex": "0000875320",
    "Novo Nordisk": "0001144519",
};

async function lookupCik(company: string): Promise<string | null> {
    // 1. Fast-path: hardcoded known CIKs
    const knownCik = KNOWN_CIKS[company] ?? KNOWN_CIKS[company.split(" ")[0]];
    if (knownCik) return knownCik;

    // 2. EDGAR full-text search index: search recent filings for the company name
    // The response has hits._source.ciks (array of padded CIK strings)
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(company)}%22&forms=10-K&dateRange=custom&startdt=2022-01-01`;
    try {
        const res = await fetchWithRetry(url, { headers: { "User-Agent": SEC_USER_AGENT } } as any);
        if (res.ok) {
            const data = await res.json();
            const hit = data?.hits?.hits?.[0]?._source;
            // Field is `ciks` (array of padded CIK strings), NOT `entity_id`
            if (hit?.ciks?.[0]) return hit.ciks[0];
        }
    } catch (_) { /* fall through */ }

    // 3. EDGAR company ATOM feed fallback
    try {
        const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(company)}&CIK=&type=10-K&dateb=&owner=include&count=5&search_text=&action=getcompany&output=atom`;
        const searchRes = await fetchWithRetry(searchUrl, { headers: { "User-Agent": SEC_USER_AGENT } } as any);
        const searchText = await searchRes.text();
        const cidMatch = searchText.match(/\/cgi-bin\/browse-edgar\?action=getcompany&CIK=(\d+)/);
        return cidMatch ? cidMatch[1].padStart(10, "0") : null;
    } catch (_) {
        return null;
    }
}

export async function handleGetSecFiling(args: {
    company: string;
    filingType?: "10-K" | "10-Q" | "8-K" | "S-1";
    maxResults?: number;
}) {
    const { company, filingType = "10-K", maxResults = 5 } = args;

    // Step 1: Try to find CIK from the EDGAR full-text search
    let cik: string | null = null;
    try {
        cik = await lookupCik(company);
    } catch (_) { /* non-fatal */ }

    // Step 2: If we have a CIK, fetch filing history from data.sec.gov
    if (cik) {
        const paddedCik = cik.padStart(10, "0");
        const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
        try {
            const submRes = await fetchWithRetry(submissionsUrl, { headers: { "User-Agent": SEC_USER_AGENT } } as any);
            if (submRes.ok) {
                const submData = await submRes.json();
                const recentFilings = submData.filings?.recent;
                if (recentFilings) {
                    // Pair up form / accessionNumber / filingDate / primaryDocument
                    const filingEntries: any[] = [];
                    for (let i = 0; i < (recentFilings.form?.length || 0) && filingEntries.length < maxResults; i++) {
                        if (recentFilings.form[i] !== filingType) continue;
                        const accession = recentFilings.accessionNumber[i];
                        const accessionPath = accession.replace(/-/g, "");
                        const filingDate = recentFilings.filingDate[i];
                        const primaryDoc = recentFilings.primaryDocument[i];
                        const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionPath}/${primaryDoc}`;
                        const indexPageUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=${filingType}&dateb=&owner=include&count=40`;
                        filingEntries.push({
                            filingDate,
                            accessionNumber: accession,
                            primaryDocumentUrl: indexUrl,
                            filingIndexUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionPath}/`,
                        });
                    }

                    if (filingEntries.length > 0) {
                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    company,
                                    cik: paddedCik,
                                    filingType,
                                    filings: filingEntries,
                                    edgarProfileUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=${filingType}&dateb=&owner=include&count=40`,
                                    pharmaIntelligenceTip: "Key 10-K sections: Item 1 'Business' (pipeline), Item 1A 'Risk Factors' (patent expiry, trial risks), Item 7 'MD&A' (revenue by product). Primary document URL links directly to the filing.",
                                    dataSource: "SEC EDGAR data.sec.gov",
                                    asOf: new Date().toISOString(),
                                }, null, 2),
                            }],
                        };
                    }
                }
            }
        } catch (_) { /* fall through to stub */ }
    }

    // Fallback: return search URL stub if CIK lookup failed
    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                company,
                filingType,
                note: "CIK lookup unsuccessful — use the EDGAR search URL below to find filings manually.",
                edgarSearchUrl: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(company)}&type=${filingType}&action=getcompany`,
                pharmaIntelligenceTip: "Key 10-K sections: Item 1 'Business' (pipeline), Item 1A 'Risk Factors' (patent expiry, trial risks), Item 7 'MD&A' (revenue by product).",
                dataSource: "SEC EDGAR",
                asOf: new Date().toISOString(),
            }, null, 2),
        }],
    };
}
