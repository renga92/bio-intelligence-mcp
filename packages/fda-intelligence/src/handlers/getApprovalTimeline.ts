import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetApprovalTimeline(args: { drug: string }) {
    const { drug } = args;

    const url = `https://api.fda.gov/drug/drugsfda.json?search=openfda.brand_name:"${encodeURIComponent(drug)}"&limit=3`;
    const res = await fetchWithRetry(url);
    const data = await res.json();

    if (!data.results) return { content: [{ type: "text", text: `No approval timeline found for ${drug}` }] };

    const timelines = data.results?.map((r: any) => {
        const submissions = r.submissions || [];
        const origSubmission = submissions.find((s: any) => s.submission_type === "ORIG");
        const priorityReview = origSubmission?.review_priority === "PRIORITY";

        const milestones = submissions
            .filter((s: any) => s.submission_status_date)
            .sort((a: any, b: any) => new Date(a.submission_status_date).getTime() - new Date(b.submission_status_date).getTime())
            .map((s: any) => ({
                type: s.submission_type,
                status: s.submission_status,
                date: s.submission_status_date,
            }));

        const approvalDate = milestones.find((m: any) => m.status === "AP")?.date;
        const submissionDate = origSubmission?.submission_status_date;
        const reviewTime = approvalDate && submissionDate
            ? Math.round((new Date(approvalDate).getTime() - new Date(submissionDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : null;

        return {
            applicationNumber: r.application_number,
            sponsor: r.sponsor_name,
            priorityReview,
            reviewTimeMonths: reviewTime,
            milestones,
            designations: origSubmission?.application_docs
                ?.filter((d: any) => ["BREAKTHROUGH", "FAST_TRACK", "ORPHAN"].some(t => d.description?.toUpperCase().includes(t)))
                .map((d: any) => d.description) || [],
        };
    });

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                drug,
                approvalTimelines: timelines,
                dataSource: "OpenFDA Drugs@FDA API",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
