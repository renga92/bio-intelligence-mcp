import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetRegulatoryLandscape(args: any) {
    const { drug, company } = args;

    const fdaUrl = `https://api.fda.gov/drug/drugsfda.json?search=products.active_ingredients.name:"${encodeURIComponent(drug)}"&limit=10`;

    try {
        const res = await fetchWithRetry(fdaUrl);
        const data = await res.json();

        const results = data.results || [];
        if (results.length === 0) {
            return { content: [{ type: "text", text: `No regulatory records found for ${drug}.` }] };
        }

        const approvals = results.map((r: any) => {
            const sponsor = r.sponsor_name || "Unknown Sponsor";
            if (company && !sponsor.toLowerCase().includes(company.toLowerCase())) return null;

            const appType = r.submissions?.[0]?.submission_type || r.application_number;
            const appNum = r.application_number;
            const approvalDate = r.submissions?.[0]?.submission_status_date || "Unknown Date";

            const isOrphan = r.products?.some((p: any) => p.orphan_designation_status === "Yes") ? "Yes" : "No";

            return `- Sponsor: ${sponsor}\n  App: ${appNum} (${appType})\n  Date: ${approvalDate}\n  Orphan: ${isOrphan}`;
        }).filter(Boolean);

        if (approvals.length === 0) return { content: [{ type: "text", text: `No regulatory records matched for ${drug} under company ${company}.` }] };

        return {
            content: [{
                type: "text",
                text: `🏛️ Regulatory Landscape for ${drug}\n\nApprovals:\n${approvals.join("\n\n")}`
            }]
        };

    } catch (error: any) {
        if (error.message.includes("404")) {
            return { content: [{ type: "text", text: `No regulatory records found for ${drug} (404 from OpenFDA).` }] };
        }
        throw new Error(`Error fetching OpenFDA data for ${drug}. ` + error.message);
    }
}
