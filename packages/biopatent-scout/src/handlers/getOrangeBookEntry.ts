import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetOrangeBookEntry(args: { drugName: string }) {
    const { drugName } = args;

    const url = `https://api.fda.gov/drug/drugsfda.json?search=products.active_ingredients.name:"${encodeURIComponent(drugName)}"&limit=5`;
    const res = await fetchWithRetry(url);
    const data = await res.json();

    if (!data.results?.length) {
        return { content: [{ type: "text", text: `No Orange Book entries found for "${drugName}".` }] };
    }

    const entries = data.results.map((r: any) => ({
        applicationNumber: r.application_number,
        applicant: r.sponsor_name,
        approvalDate: r.submissions?.find((s: any) => s.submission_type === "ORIG")?.submission_status_date,
        products: r.products?.map((p: any) => ({
            dosageForm: p.dosage_form,
            route: p.route,
            strength: p.active_ingredients?.map((ai: any) => `${ai.name} ${ai.strength}`).join(", "),
            marketingStatus: p.marketing_status,
        })),
        exclusivities: r.submissions?.flatMap((s: any) =>
            s.application_docs?.filter((d: any) => d.type === "exclusivity").map((e: any) => ({
                code: e.description,
                expiryDate: e.date,
            })) || []
        ),
    }));

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                drug: drugName,
                orangeBookEntries: entries,
                dataSource: "FDA Orange Book via OpenFDA API",
                note: "Exclusivity codes: NCE=New Chemical Entity (5yr), ODE=Orphan Drug (7yr), PED=Pediatric (6mo). These run separately from and in addition to patent terms.",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
