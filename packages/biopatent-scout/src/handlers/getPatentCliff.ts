import { config } from "@biopharma/shared";

const PATENTSVIEW_V2_BASE = "https://search.patentsview.org/api/v1/patent/";

export async function handleGetPatentCliff(args: {
    company: string;
    windowStartYear?: number;
    windowEndYear?: number;
}) {
    const { company, windowStartYear = new Date().getFullYear(), windowEndYear = windowStartYear + 5 } = args;

    if (!config.usptoApiKey) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    error: "USPTO_API_KEY not configured",
                    resolution: "Register for a free API key at https://patentsview.org/apis/purpose and set USPTO_API_KEY in your environment.",
                    alternativeSource: "Orange Book data (via get_orange_book_entry) covers FDA-listed drug patent expiries without an API key.",
                    company,
                    window: `${windowStartYear}–${windowEndYear}`,
                    dataSource: "USPTO PatentsView v2 API",
                }, null, 2)
            }]
        };
    }

    // Use GET with URL-encoded params for PatentsView v2
    const params = new URLSearchParams({
        q: JSON.stringify({ "_text_phrase": { "assignees.assignee_organization": company } }),
        f: JSON.stringify(["patent_id", "patent_title", "application_filed_date", "grant_date"]),
        o: JSON.stringify({ size: 100, sort: [{ "application_filed_date": "desc" }] }),
    });

    let data;
    try {
        const res = await fetch(`${PATENTSVIEW_V2_BASE}?${params.toString()}`, {
            headers: {
                "X-Api-Key": config.usptoApiKey,
                "Accept": "application/json",
            },
        });
        if (!res.ok) {
            const errText = await res.text();
            return { content: [{ type: "text", text: `USPTO PatentsView API error ${res.status}: ${errText.slice(0, 300)}` }] };
        }
        data = await res.json();
    } catch (e) {
        return { content: [{ type: "text", text: `Error fetching from USPTO PatentsView: ${e}` }] };
    }

    const rawPatents: any[] = data?.patents ?? [];
    if (rawPatents.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ message: `No patents found for company: ${company}`, company }, null, 2) }] };
    }

    const cliffEvents = rawPatents
        .filter((p: any) => p.application_filed_date)
        .map((p: any) => {
            const filed = new Date(p.application_filed_date);
            const expiry = new Date(filed);
            expiry.setFullYear(expiry.getFullYear() + 20);
            return { ...p, estimatedExpiry: expiry };
        })
        .filter((p: any) => {
            const expiryYear = p.estimatedExpiry.getFullYear();
            return expiryYear >= windowStartYear && expiryYear <= windowEndYear;
        })
        .sort((a: any, b: any) => a.estimatedExpiry.getTime() - b.estimatedExpiry.getTime());

    const byYear: Record<number, number> = {};
    cliffEvents.forEach((p: any) => {
        const yr = p.estimatedExpiry.getFullYear();
        byYear[yr] = (byYear[yr] || 0) + 1;
    });

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                company,
                window: `${windowStartYear}–${windowEndYear}`,
                totalPatentsScanned: rawPatents.length,
                totalPatentsExpiring: cliffEvents.length,
                expiryByYear: byYear,
                topExpiringPatents: cliffEvents.slice(0, 10).map((p: any) => ({
                    patentId: p.patent_id,
                    title: p.patent_title,
                    grantDate: p.grant_date ?? null,
                    estimatedExpiry: p.estimatedExpiry.toISOString().split("T")[0],
                })),
                riskAssessment: cliffEvents.length > 20 ? "HIGH — significant IP erosion window" :
                    cliffEvents.length > 10 ? "MODERATE — notable exposure" : "LOW",
                dataSource: "USPTO PatentsView v2 API",
                note: "Expiry estimates based on filing date + 20 years. Does not include PTE extensions. Verify against FDA Orange Book for approved drugs.",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}

