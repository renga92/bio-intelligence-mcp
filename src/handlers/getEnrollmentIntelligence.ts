import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

export async function handleGetEnrollmentIntelligence(args: any) {
    const { condition, company } = args;

    let queryParts = [];
    if (condition) queryParts.push(`query.cond=${encodeURIComponent(condition)}`);
    if (company) queryParts.push(`query.spons=${encodeURIComponent(company)}`);
    const query = queryParts.join("&");

    let nextPageToken: string | null = null;
    let pages = 0;
    const MAX_PAGES = config.maxPagesPerQuery;

    let totalEnrollment = 0;
    let totalDurationMonths = 0;
    let totalSites = 0;
    let validTrialsForEnrollment = 0;
    let validTrialsForDuration = 0;
    let validTrialsForSites = 0;

    do {
        let url = `https://clinicaltrials.gov/api/v2/studies?${query}&pageSize=100&fields=protocolSection.designModule,protocolSection.statusModule,protocolSection.contactsLocationsModule`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await fetchWithRetry(url);
        const data = await res.json();

        data.studies?.forEach((s: any) => {
            const enroll = s.protocolSection?.designModule?.enrollmentInfo?.count;
            if (typeof enroll === 'number') {
                totalEnrollment += enroll;
                validTrialsForEnrollment++;
            }

            const start = s.protocolSection?.statusModule?.startDateStruct?.date;
            const end = s.protocolSection?.statusModule?.completionDateStruct?.date;
            if (start && end) {
                const ms = new Date(end).getTime() - new Date(start).getTime();
                if (ms > 0) {
                    totalDurationMonths += ms / (1000 * 60 * 60 * 24 * 30.44);
                    validTrialsForDuration++;
                }
            }

            const locs = s.protocolSection?.contactsLocationsModule?.locations;
            if (Array.isArray(locs)) {
                totalSites += locs.length;
                validTrialsForSites++;
            }
        });

        nextPageToken = data.nextPageToken || null;
        pages++;
    } while (nextPageToken && pages < MAX_PAGES);

    if (validTrialsForEnrollment === 0) return { content: [{ type: "text", text: "Not enough data to compute enrollment intelligence." }] };

    const avgEnroll = totalEnrollment / validTrialsForEnrollment;
    const avgDuration = validTrialsForDuration > 0 ? totalDurationMonths / validTrialsForDuration : 0;
    const avgSites = validTrialsForSites > 0 ? totalSites / validTrialsForSites : 0;
    const velocity = avgDuration > 0 ? avgEnroll / avgDuration : 0;

    return {
        content: [{
            type: "text",
            text: `📊 Enrollment Intelligence for ${condition || ""} ${company ? `(${company})` : ""}\n\n` +
                `- Average Enrollment: ${Math.round(avgEnroll)} patients/trial\n` +
                `- Average Duration: ${avgDuration.toFixed(1)} months\n` +
                `- Average Site Density: ${avgSites.toFixed(1)} sites/trial\n` +
                `- Enrollment Velocity Benchmark: ${velocity.toFixed(1)} patients/month/trial`
        }]
    };
}
