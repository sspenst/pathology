import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({
  GET: {
    query: {
      id: ValidObjectId(true)
    }
  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const collection = await getCollection2( { $match: { _id: new Types.ObjectId(id as string) } }, reqUser);

  if (!collection) {
    return res.status(404).json({
      error: 'Error finding Collection',
    });
  }

  return res.status(200).json(collection);
});

export async function getCollection2(matchQuery: PipelineStage, reqUser: User | null, noDraftLevels = true) {
  const collectionAgg = await CollectionModel.aggregate(([
    {
      ...matchQuery,
    },
    {
      // populate user for collection
      $lookup: {
        from: UserModel.collection.name,
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          { $project: USER_DEFAULT_PROJECTION },
        ]
      },
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        'levelsWithSort': {
          $map: {
            input: '$levels',
            as: 'item',
            in: {
              _id: '$$item', // making levels an array of objects with _id
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelsWithSort._id',
        foreignField: '_id',
        let: { 'orderedIds': '$levelsWithSort._id' },

        as: 'levels',
        pipeline: [
          {
            $match: {
              ...(noDraftLevels ? {
                isDraft: {
                  $ne: true
                }
              } : undefined),
              isDeleted: {
                $ne: true
              }
            },
          },
          {
            $addFields: {
              sort: {
                $indexOfArray: [ '$$orderedIds', '$_id' ]
              }
            }
          },
          {
            $sort: {
              sort: 1
            }
          },
          {
            $project: {
              ...LEVEL_DEFAULT_PROJECTION,
              ...(noDraftLevels ? {

              } : {
                isDraft: 1,
              }),
            },
          },

          ...getEnrichLevelsPipelineSteps(reqUser, '_id', ''),
          {
            // populate user
            $lookup: {
              from: UserModel.collection.name,
              localField: 'userId',
              foreignField: '_id',
              as: 'userId',
              pipeline: [
                { $project: USER_DEFAULT_PROJECTION },
              ]
            },
          },
          {
            $unwind: {
              path: '$userId',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unset: 'levelsWithSort'
    },

  ] as PipelineStage[]));

  if (!collectionAgg || collectionAgg.length === 0) {
    return null;
  }

  (collectionAgg[0] as Collection).levels?.map(level => {
    cleanUser(level.userId);

    return level;
  });

  return collectionAgg[0];
}
