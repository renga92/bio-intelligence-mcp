import { config } from "@biopharma/shared";

const PATENTSVIEW_V2_BASE = "https://search.patentsview.org/api/v1/patent/";
const FIELDS = ["patent_id", "patent_title", "patent_abstract", "application_filed_date",
    "grant_date", "assignees.assignee_organization", "inventors.inventor_last_name"];

export async function handleSearchPatents(args: {
    query?: string;
    assignee?: string;
    filedAfter?: string;
    filedBefore?: string;
    maxResults?: number;
}) {
    const { query, assignee, filedAfter, filedBefore, maxResults = 10 } = args;

    if (!config.usptoApiKey) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    error: "USPTO_API_KEY not configured",
                    resolution: "Register for a free API key at https://patentsview.org/apis/purpose and set USPTO_API_KEY in your environment.",
                    alternativeSource: "Orange Book data (via get_orange_book_entry) is available without an API key and covers FDA-listed drug patents.",
                    dataSource: "USPTO PatentsView v2 API",
                }, null, 2)
            }]
        };
    }

    // PatentsView v2 uses GET with JSON-encoded query params
    const filters: any[] = [];
    if (query) filters.push({ "_text_any": { "patent_abstract": query } });
    if (assignee) filters.push({ "_text_phrase": { "assignees.assignee_organization": assignee } });
    if (filedAfter) filters.push({ "_gte": { "application_filed_date": filedAfter } });
    if (filedBefore) filters.push({ "_lte": { "application_filed_date": filedBefore } });

    const q = filters.length === 1 ? filters[0] : filters.length > 1 ? { "_and": filters } : {};
    const params = new URLSearchParams({
        q: JSON.stringify(q),
        f: JSON.stringify(FIELDS),
        o: JSON.stringify({ size: maxResults, sort: [{ "grant_date": "desc" }] }),
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
        return { content: [{ type: "text", text: JSON.stringify({ message: "No patents found for the given criteria.", query: { query, assignee, filedAfter, filedBefore } }, null, 2) }] };
    }

    const patents = rawPatents.map((p: any) => {
        const filedDate = p.application_filed_date ? new Date(p.application_filed_date) : null;
        const expiryDate = filedDate ? new Date(filedDate) : null;
        if (expiryDate) expiryDate.setFullYear(expiryDate.getFullYear() + 20);
        const yearsRemaining = expiryDate
            ? (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25)
            : null;

        return {
            patentId: p.patent_id,
            title: p.patent_title,
            assignee: p.assignees?.[0]?.assignee_organization ?? "Unknown",
            filedDate: p.application_filed_date ?? null,
            grantDate: p.grant_date ?? null,
            estimatedExpiry: expiryDate ? expiryDate.toISOString().split("T")[0] : null,
            yearsOfProtectionRemaining: yearsRemaining !== null ? Math.max(0, yearsRemaining).toFixed(1) : null,
            isExpired: yearsRemaining !== null ? yearsRemaining < 0 : null,
        };
    });

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                totalFound: data.total_patent_count ?? rawPatents.length,
                returned: patents.length,
                patents,
                dataSource: "USPTO PatentsView v2 API",
                note: "Expiry = filing date + 20 years. Does not account for PTA/PTE adjustments. Consult Orange Book for FDA-listed patent terms.",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
