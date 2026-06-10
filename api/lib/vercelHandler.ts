export class ApiQueryError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

export function requireQueryString(
    query: Record<string, string | string[] | undefined>,
    key: string,
): string {
    const value = query[key];
    if (!value || typeof value !== 'string') {
        throw new ApiQueryError(400, `Query parameter "${key}" is required`);
    }
    return value;
}

type QueryRecord = Record<string, string | string[] | undefined>;

export function createGetHandler(
    handler: (query: QueryRecord) => Promise<{ status?: number; body: unknown }>,
) {
    return async (req: { method?: string; query?: QueryRecord }, res: {
        status: (code: number) => { json: (body: unknown) => void };
    }) => {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        try {
            const { status = 200, body } = await handler(req.query ?? {});
            return res.status(status).json(body);
        } catch (error) {
            if (error instanceof ApiQueryError) {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('API handler error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}
