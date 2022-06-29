import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  const { slugName } = req.query;

  try {
    const promises = [
      res.revalidate(`/level/${slugName}`),
    ];

    await Promise.all(promises);

    return res.status(200).json({ revalidated: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    console.log('Error!!!', err);
    console.log('\n\n\n');

    return res.status(500).send({ message: err.message, stack: err.stack });
  }
}
