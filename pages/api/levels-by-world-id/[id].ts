import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import { LevelModel, WorldModel } from '../../../models/mongoose';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';
import World from '../../../models/db/world';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  const world = await WorldModel.findOne<World>({ _id: id })
    .populate({path:'levels', match: { isDraft: {$ne: true} }});

  const levels = world?.levels;

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
}
