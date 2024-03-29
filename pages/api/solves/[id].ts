import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Record from '../../../models/db/record';
import { StatModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    all: ValidType('string'),
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { all, id } = req.query;

  await dbConnect();

  try {
    const stats = await StatModel.find<Record>({ levelId: id, complete: true }, {}, all === 'true' ? {} : { limit: 10 }).populate('userId').sort({ ts: -1 });

    stats.forEach(stat => cleanUser(stat.userId));

    return res.status(200).json(stats);
  } catch (e) {
    logger.error(e);

    return res.status(500).json({
      error: 'Error finding solves',
    });
  }
});
