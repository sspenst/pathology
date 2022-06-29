import Level from '../models/db/level';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { NextApiResponse } from 'next';

export default async function revalidateLevel(
  req: NextApiRequestWithAuth,
  res: NextApiResponse,
  level:Level,
  body = undefined
) {
  try {
    const revalidateRes = await fetch(`${req.headers.origin}/api/revalidate/level/${level.slug}?secret=${process.env.REVALIDATE_SECRET}`);

    if (revalidateRes.status === 200) {
      return res.status(200).json(body ?? { updated: true });
    } else {
      throw await revalidateRes.text();
    }
  } catch (err) {
    console.trace(err);

    return res.status(500).json({
      error: 'Error revalidating level ' + err,
    });
  }
}
