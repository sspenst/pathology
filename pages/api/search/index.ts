import { ObjectId } from 'bson';
import { PipelineStage } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDifficultyRangeFromName } from '../../../components/difficultyDisplay';
import LevelDataType from '../../../constants/levelDataType';
import TimeRange from '../../../constants/timeRange';
import apiWrapper from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { FilterSelectOption } from '../../../helpers/filterSelectOptions';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, UserModel } from '../../../models/mongoose';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';
import { BlockFilterMask, SearchQuery } from '../../search';

function cleanInput(input: string) {
  return input.replace(/[^-a-zA-Z0-9_' ]/g, '.*');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function doQuery(query: SearchQuery, userId?: ObjectId, projection: any = LEVEL_SEARCH_DEFAULT_PROJECTION) {
  await dbConnect();

  const { block_filter, difficulty_filter, max_steps, min_steps, page, search, searchAuthor, searchAuthorId, show_filter, sort_by, sort_dir, time_range } = query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = { 'isDraft': false } as { [key: string]: any };
  const limit = 20;

  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  if (searchAuthor && searchAuthor.length > 0) {
    const searchAuthorStr = cleanInput(searchAuthor);
    const user = await UserModel.findOne<User>({ 'name': searchAuthorStr }, {}, { lean: true });

    if (user) {
      searchObj['userId'] = user._id;
    }
  } else if (searchAuthorId) {
    if (ObjectId.isValid(searchAuthorId)) {
      searchObj['userId'] = new ObjectId(searchAuthorId);
    }
  }

  if (min_steps && max_steps) {
    searchObj['leastMoves'] = {
      $gte: parseInt(min_steps),
      $lte: parseInt(max_steps),
    };
  }

  if (time_range) {
    if (time_range === TimeRange[TimeRange.Day]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime() / 1000;
    }
    else if (time_range === TimeRange[TimeRange.Week]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
    else if (time_range === TimeRange[TimeRange.Month]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
    else if (time_range === TimeRange[TimeRange.Year]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
  }

  const sort_direction = (sort_dir === 'asc') ? 1 : -1;

  const sortObj = [] as [string, number][];

  if (sort_by) {
    if (sort_by === 'name') {
      sortObj.push(['name', sort_direction]);
    }
    else if (sort_by === 'least_moves') {
      sortObj.push(['leastMoves', sort_direction]);
    }
    else if (sort_by === 'ts') {
      sortObj.push(['ts', sort_direction]);
    }
    else if (sort_by === 'reviews_score') {
      sortObj.push(['calc_reviews_score_laplace', sort_direction], ['calc_reviews_score_avg', sort_direction], ['calc_reviews_count', sort_direction]);

      searchObj['calc_reviews_score_avg'] = { $gte: 0 };
    }
    else if (sort_by === 'total_reviews') {
      sortObj.push(['calc_reviews_count', sort_direction]);
    }
    else if (sort_by === 'players_beaten') {
      sortObj.push(['calc_stats_players_beaten', sort_direction]);
    }
    else if (sort_by === 'calc_difficulty_estimate') {
      sortObj.push(['calc_difficulty_estimate', sort_direction]);
      // don't show pending levels when sorting by difficulty
      searchObj['calc_difficulty_estimate'] = { $gte: 0 };
    }
  }

  sortObj.push(['_id', sort_direction]);

  let skip = 0;

  if (page) {
    skip = ((Math.abs(parseInt(page))) - 1) * limit;
  }

  let levelFilterStatLookupStage: PipelineStage[] = [{ $unwind: '$_id' }] as PipelineStage[];

  if (show_filter === FilterSelectOption.HideWon) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: 'stats',
        let: { levelId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', new ObjectId(userId)] },

                ]
              }
            }
          },
        ],
        as: 'stat',
      }
    },
    {
      $unwind: {
        path: '$stat',
        preserveNullAndEmptyArrays: true,
      }
    },
    {
      $match: {
        $or: [
          { 'stat.complete': false },
          { 'stat.complete': { $exists: false } },
        ]
      }
    }
    ] as PipelineStage[];
  } else if (show_filter === FilterSelectOption.ShowInProgress) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: 'stats',
        let: { levelId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$levelId', '$$levelId'] }, { $eq: ['$userId', new ObjectId(userId)] }] } } },
        ],
        as: 'stat',
      }
    },
    {
      $unwind: {
        path: '$stat',
        preserveNullAndEmptyArrays: true,
      }
    },
    { $match: { 'stat.complete': false } }
    ] as PipelineStage[];
  }

  if (difficulty_filter) {
    if (difficulty_filter === 'Pending') {
      searchObj['calc_difficulty_estimate'] = { $eq: -1 };
    } else {
      const difficulty = getDifficultyRangeFromName(difficulty_filter);
      const minValue = difficulty[0] as number;
      const maxValue = difficulty[1] as number;

      searchObj['calc_difficulty_estimate'] = {
        $gte: minValue,
        $lt: maxValue,
      };
    }
  }

  // NB: skip regex for NONE for more efficient query
  if (block_filter !== undefined && Number(block_filter) !== BlockFilterMask.NONE) {
    const blockFilterMask = Number(block_filter);
    let mustNotContain = '';

    if (blockFilterMask & BlockFilterMask.BLOCK) {
      mustNotContain = mustNotContain + LevelDataType.Block;
    }

    if (blockFilterMask & BlockFilterMask.HOLE) {
      mustNotContain = mustNotContain + LevelDataType.Hole;
    }

    if (blockFilterMask & BlockFilterMask.RESTRICTED) {
      mustNotContain = mustNotContain + '6-9A-J';
    }

    const mustNotContainRegex = mustNotContain !== '' ? `(?!.*[${mustNotContain}])` : '';

    searchObj['data'] = { $regex: new RegExp(`^(${mustNotContainRegex}[0-9A-J\n]+)$`, 'g') };
  }

  try {
    const [levelsAgg] = await Promise.all([
      LevelModel.aggregate([
        { $match: searchObj },

        { $project: {
          ...projection,
        },
        },
        ...levelFilterStatLookupStage,

        { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) },

        // { $skip: skip },
        // { $limit: limit },
        { '$facet': {
          metadata: [ { $count: 'totalRows' } ],
          data: [ { $skip: skip }, { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId',
                pipeline: [
                  { $project: { ...USER_DEFAULT_PROJECTION } },
                ],
              },
            },
            { $unwind: '$userId' },
            // note this last getEnrichLevelsPipeline is "technically a bit wasteful" if they select Hide Won or Show In Progress
            // Because technically the above levelFilterStatLookupStage will have this data already...
            // But since the results are limited by limit, this is constant time and not a big deal to do the lookup again...
            ...getEnrichLevelsPipelineSteps(new ObjectId(userId) as unknown as User, '_id', '') as PipelineStage.Lookup[],

          ] // add projection here wish you re-shape the docs
        } },
        {
          $unwind: {
            path: '$metadata',
            preserveNullAndEmptyArrays: true,
          }
        },
      ]),
    ]);

    const totalRows = levelsAgg[0]?.metadata?.totalRows || 0;

    const levels = levelsAgg[0]?.data as EnrichedLevel[];

    levels.forEach((level) => {
      cleanUser(level.userId);
    });

    return { levels: levels, totalRows: totalRows };
  } catch (e) {
    logger.error(e);

    return null;
  }
}

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();
  const token = req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const query = await doQuery(req.query as SearchQuery, reqUser?._id);

  if (!query) {
    return res.status(500).json({
      error: 'Error querying Levels',
    });
  }

  return res.status(200).json(query);
});
