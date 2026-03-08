import { fetchWithRetry } from "@biopharma/shared";

// --- Therapeutic class aliases for pharm_class_epc searches ---
// EPC values must exactly match OpenFDA's pharm_class_epc strings
const CONDITION_ALIASES: Record<string, string> = {
    "type 1 diabetes": "GLP-1 Receptor Agonist",
    "type 2 diabetes": "GLP-1 Receptor Agonist",
    "glp-1": "GLP-1 Receptor Agonist",
    "glp1": "GLP-1 Receptor Agonist",
    "diabetes": "GLP-1 Receptor Agonist",
    "obesity": "Lipase Inhibitor",
    "alzheimer": "Acetylcholinesterase Inhibitor",
    "cancer": "Antineoplastic",
    "oncology": "Antineoplastic",
    "multiple sclerosis": "Interferon beta",
    "autoimmune": "Interleukin Inhibitor",
};

function buildSearchUrl(condition?: string, company?: string): string {
    const BASE = "https://api.fda.gov/drug/drugsfda.json";
    const parts: string[] = [];

    if (company) {
        // sponsor_name is the correct Drugs@FDA field for the application sponsor
        parts.push(`sponsor_name:"${company}"`);
    }
    if (condition) {
        const condLower = condition.toLowerCase();
        // Try to map to a known EPC class; otherwise search brand name
        const epcClass = Object.entries(CONDITION_ALIASES).find(([k]) => condLower.includes(k))?.[1];
        if (epcClass) {
            parts.push(`openfda.pharm_class_epc:"${epcClass}"`);
        } else {
            parts.push(`openfda.brand_name:"${condition}"`);
        }
    }

    // If no filters, fall back to broad ORIG submissions only
    const search = parts.length > 0 ? parts.join("+AND+") : "submissions.submission_type:ORIG";
    return `${BASE}?search=${search}&limit=25`;
}

export async function handleGetBreakthroughDesignations(args: { condition?: string; company?: string }) {
    const { condition, company } = args;

    const url = buildSearchUrl(condition, company);

    let data: any;
    try {
        const res = await fetchWithRetry(url);
        if (res.status === 404) {
            // OpenFDA returns 404 when query matches 0 results — this is NOT an endpoint error
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        query: { condition, company },
                        status: "no_results",
                        breakthroughDesignations: [],
                        priorityReviewApprovals: [],
                        explanation: "No FDA drug applications matched the specified condition/company in the Drugs@FDA dataset. Note: Breakthrough Therapy Designations are not a directly indexed field in Drugs@FDA — this tool searches for Priority Review designations (the regulatory surrogate available in this dataset). BTDs are sparse and may not appear for early-stage programs without an approved NDA.",
                        dataSource: "OpenFDA Drugs@FDA",
                        alternativeResources: [
                            "https://www.fda.gov/patients/fast-track-breakthrough-therapy-accelerated-approval-priority-review/breakthrough-therapy",
                            "https://www.accessdata.fda.gov/scripts/opdlisting/oopd/"
                        ],
                        asOf: new Date().toISOString(),
                    }, null, 2)
                }]
            };
        }
        if (!res.ok) {
            throw new Error(`OpenFDA API returned ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
        }
        data = await res.json();
    } catch (e: any) {
        if (e?.message?.includes("404")) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        query: { condition, company },
                        status: "no_results",
                        breakthroughDesignations: [],
                        explanation: "No matching drug applications found. OpenFDA returns 404 when zero results are found — this is not an API error. BTDs may not be indexed for the specified query.",
                        dataSource: "OpenFDA Drugs@FDA",
                        asOf: new Date().toISOString(),
                    }, null, 2)
                }]
            };
        }
        return {
            content: [{ type: "text", text: `Error querying FDA BTD data: ${e?.message ?? e}` }]
        };
    }

    // Drugs@FDA doesn't have a "breakthrough_designation" field directly.
    // We use two proxies:
    //   1. submissions where review_priority = "PRIORITY" (often granted with BTD)
    //   2. application_docs with "BREAKTHROUGH" in description
    const priorityReviews: any[] = [];
    const btdDocs: any[] = [];

    for (const result of (data.results ?? [])) {
        const brandName = result.openfda?.brand_name?.[0] ?? result.application_number;
        const genericName = result.openfda?.generic_name?.[0];
        const sponsor = result.sponsor_name;
        const appNum = result.application_number;

        for (const sub of (result.submissions ?? [])) {
            // Priority Review on an original application is the strongest available proxy for BTD
            if (sub.submission_type === "ORIG" && sub.review_priority === "PRIORITY") {
                priorityReviews.push({
                    drug: brandName,
                    genericName,
                    sponsor,
                    applicationNumber: appNum,
                    submissionType: sub.submission_type,
                    reviewPriority: sub.review_priority,
                    approvalDate: sub.submission_status_date,
                    classCode: sub.submission_class_code,
                });
            }
            // Also scan docs for explicit BTD grant letters
            for (const doc of (sub.application_docs ?? [])) {
                if (doc.description?.toUpperCase().includes("BREAKTHROUGH")) {
                    btdDocs.push({
                        drug: brandName,
                        genericName,
                        sponsor,
                        applicationNumber: appNum,
                        designationDate: doc.date,
                        docType: doc.type,
                        docDescription: doc.description,
                        docUrl: doc.url,
                    });
                }
            }
        }
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                query: { condition, company },
                status: "ok",
                // Explicit BTD grant letters found in application docs (rare in this dataset)
                explicitBreakthroughDocs: btdDocs,
                // Priority Review on original submissions — best proxy available via Drugs@FDA
                priorityReviewOriginalApplications: priorityReviews,
                interpretation: btdDocs.length > 0
                    ? "Explicit BTD grant letters found in application documents."
                    : priorityReviews.length > 0
                        ? "No explicit BTD grant letters in Drugs@FDA, but Priority Review designations found — BTD often accompanies Priority Review for original NDA/BLA submissions."
                        : "No Priority Review or explicit BTD designations found in Drugs@FDA for this query. BTD data may be incomplete in this dataset.",
                significance: "Breakthrough Therapy Designation reduces median review time and signals strong regulatory confidence. Historically correlated with ~30% higher probability of NDA approval.",
                dataLimit: "Drugs@FDA does not have a dedicated 'breakthrough_therapy' field. For the authoritative list, see: https://www.fda.gov/patients/fast-track-breakthrough-therapy-accelerated-approval-priority-review/breakthrough-therapy",
                dataSource: "OpenFDA Drugs@FDA API",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}

