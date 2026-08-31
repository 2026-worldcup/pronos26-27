import { syncPremierLeague } from '../lib/premier-league-sync.mts';

export default async (req: Request) => {
    const url = new URL(req.url);
    const expected = Netlify.env.get('PL_BOOTSTRAP_TOKEN');
    if (!expected || url.searchParams.get('token') !== expected) {
        return new Response('Unauthorized', { status: 401 });
    }
    try {
        const result = await syncPremierLeague();
        return Response.json({ ok: true, ...result });
    } catch (error) {
        console.error(error);
        return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 });
    }
};

export const config = {
    path: '/api/bootstrap-premier-league'
};
