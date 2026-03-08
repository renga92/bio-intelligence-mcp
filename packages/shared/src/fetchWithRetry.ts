export interface FetchOptions {
    retries?: number;
    baseDelayMs?: number;
    timeout?: number;
}

export async function fetchWithRetry(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { retries = 3, baseDelayMs = 500, timeout = 15000 } = options;

    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) return res;

            // Rate limited — back off and retry
            if (res.status === 429) {
                const retryAfter = parseInt(res.headers.get("Retry-After") || "1");
                await sleep(Math.max(retryAfter * 1000, baseDelayMs * Math.pow(2, attempt)));
                continue;
            }

            // Client error — don't retry
            if (res.status >= 400 && res.status < 500) {
                const body = await res.text();
                throw new APIError(res.status, res.statusText, body, url);
            }

            // Server error — retry
            if (attempt < retries - 1) {
                await sleep(baseDelayMs * Math.pow(2, attempt));
                continue;
            }

            throw new APIError(res.status, res.statusText, "", url);
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof APIError) throw err;
            if (attempt === retries - 1) throw err;
            await sleep(baseDelayMs * Math.pow(2, attempt));
        }
    }

    throw new Error(`All ${retries} attempts failed for: ${url}`);
}

export class APIError extends Error {
    constructor(
        public readonly status: number,
        public readonly statusText: string,
        public readonly body: string,
        public readonly url: string
    ) {
        super(`${status} ${statusText}: ${body.slice(0, 200)}`);
        this.name = "APIError";
    }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
