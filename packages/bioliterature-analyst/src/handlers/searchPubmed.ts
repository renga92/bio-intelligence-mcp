import { fetchWithRetry, config } from "@biopharma/shared";

export async function handleSearchPubmed(args: {
    query: string;
    yearFrom?: number;
    yearTo?: number;
    maxResults?: number;
}) {
    const { query, yearFrom, yearTo, maxResults = 10 } = args;

    let searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
    if (yearFrom || yearTo) {
        searchUrl += `&datetype=pdat&mindate=${yearFrom || 2000}&maxdate=${yearTo || new Date().getFullYear()}`;
    }
    if (config.ncbiApiKey) searchUrl += `&api_key=${config.ncbiApiKey}`;

    const searchRes = await fetchWithRetry(searchUrl);
    const searchData = await searchRes.json();
    const pmids: string[] = searchData.esearchresult?.idlist || [];

    if (!pmids.length) {
        return { content: [{ type: "text", text: `No PubMed results for: "${query}"` }] };
    }

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json`;
    const summaryRes = await fetchWithRetry(summaryUrl);
    const summaryData = await summaryRes.json();

    const papers = pmids.map((id: string) => {
        const doc = summaryData.result?.[id];
        return {
            pmid: id,
            title: doc?.title,
            authors: doc?.authors?.slice(0, 3).map((a: any) => a.name).join(", ") + (doc?.authors?.length > 3 ? " et al." : ""),
            journal: doc?.fulljournalname,
            publicationDate: doc?.pubdate,
            doi: doc?.elocationid?.replace("doi: ", ""),
            pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        };
    });

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                query,
                totalFound: searchData.esearchresult?.count,
                returned: papers.length,
                papers,
                dataSource: "NCBI PubMed Entrez API",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
