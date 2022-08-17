import { NextApiResponse } from 'next';
import { logger } from './logger';

export default async function revalidateLevel(res: NextApiResponse, slugName: string) {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  try {
    await res.revalidate(`/level/${slugName}`);
  } catch (e) {
    logger.trace(e);

    return false;
  }

  return true;
}
