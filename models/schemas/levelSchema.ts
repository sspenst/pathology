import { LevelModel, PlayAttemptModel, ReviewModel, StatModel, UserModel } from '../mongoose';
import { AttemptContext } from './playAttemptSchema';
import Level from '../db/level';
import generateSlug from '../../helpers/generateSlug';
import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema<Level>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    authorNote: {
      type: String,
      maxlength: 1024 * 5, // 5 kb limit seems reasonable
    },
    calc_playattempts_count: {
      type: Number,
      default: 0,
    },
    calc_playattempts_duration_sum: {
      type: Number,
      default: 0,
    },
    calc_reviews_count: {
      type: Number,
      required: false,
      default: 0
    },
    calc_reviews_score_avg: {
      type: Number,
      required: false,
      default: 0.00
    },
    calc_reviews_score_laplace: {
      type: Number,
      required: false,
      default: 0.00
    },
    calc_stats_players_beaten: {
      type: Number,
      required: false,
      default: 0
    },
    // https://github.com/sspenst/pathology/wiki/Level-data-format
    data: {
      type: String,
      required: true,
      minLength: 2, // always need start and end
      maxlength: 40 * 40 + 39,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
    isDraft: {
      type: Boolean,
      required: true,
    },
    leastMoves: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    points: {
      type: Number,
      required: true,
    },
    psychopathId: {
      type: Number,
    },
    slug: {
      type: String,
    },
    ts: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
  },
  {
    collation: {
      locale: 'en_US',
      strength: 2,
    },
  }
);

async function calcReviews(lvl: Level) {
  // get average score for reviews with levelId: id
  const reviews = await ReviewModel.find({
    levelId: lvl._id,
  });

  let totalUp = 0;
  let totalVotes = 0;

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    if (review.score !== 0) {
      // maps to 0, 0.25, 0.5, 0.75, 1
      const incr = (review.score - 1) / 4;

      totalUp += incr;
      totalVotes++;
    }
  }

  // priors
  const A = 2.0;
  const B = 3.0;

  const reviewsScoreSum = reviews.reduce((acc, review) => acc + review.score, 0);
  const reviewsScoreAvg = totalVotes > 0 ? reviewsScoreSum / totalVotes : 0;
  const reviewsScoreLaplace = (totalUp + A) / (totalVotes + B);

  return {
    calc_reviews_count: reviews.length,
    calc_reviews_score_avg: reviewsScoreAvg,
    calc_reviews_score_laplace: reviewsScoreLaplace,
  };
}

async function calcStats(lvl: Level) {
  // get last record with levelId: id
  // group by userId
  const aggs = [
    {
      $match: {
        levelId: lvl._id,
        moves: lvl.leastMoves
      }
    },
    {
      $group: {
        _id: '$userId',
        count: {
          $sum: 1,
        },
      }
    }
  ];

  const q = await StatModel.aggregate(aggs);

  const players_beaten = q.length;

  return {
    calc_stats_players_beaten: players_beaten
  };
}

export async function calcPlayAttempts(lvl: Level) {
  // should hypothetically count play attempts...
  // count where endTime is not equal to start time
  const count = await PlayAttemptModel.countDocuments({
    levelId: lvl._id,
    attemptContext: { $ne: AttemptContext.BEATEN },
  });

  // sumDuration is all of the sum(endTime-startTime) within the playAttempts
  const sumDuration = await PlayAttemptModel.aggregate([
    {
      $match: {
        levelId: lvl._id,
        attemptContext: { $ne: AttemptContext.BEATEN },
      }
    },
    {
      $group: {
        _id: null,
        sumDuration: {
          $sum: {
            $subtract: ['$endTime', '$startTime']
          }
        }
      }
    }
  ]);

  const update = {
    calc_playattempts_count: count,
    calc_playattempts_duration_sum: sumDuration[0].sumDuration,
  };

  await LevelModel.findByIdAndUpdate(lvl._id, {
    $set: update,
  }, { new: true });
}

export async function refreshIndexCalcs(lvl: Level) {
  // @TODO find a way to parallelize these in one big promise
  const reviews = await calcReviews(lvl);
  const stats = await calcStats(lvl);

  // save level
  const update = {
    ...reviews,
    ...stats
  };

  await LevelModel.findByIdAndUpdate(lvl._id, update);
}

LevelSchema.index({ slug: 1 }, { name: 'slug_index', unique: true });

LevelSchema.pre('save', function (next) {

  if (this.isModified('name')) {
    UserModel.findById(this.userId).then(async (user) => {
      generateSlug(null, user.name, this.name).then((slug) => {
        this.slug = slug;

        return next();
      }).catch((err) => {
        return next(err);
      });
    }).catch((err) => {
      return next(err);
    });
  } else {
    return next();
  }
});

LevelSchema.pre('updateOne', function (next) {
  this.options.runValidators = true;

  if (this.getUpdate().$set?.name) {
    LevelModel.findById(this._conditions._id)
      .populate('userId', 'name')
      .then(async (level) => {
        if (!level) {
          return next(new Error('Level not found'));
        }

        generateSlug(level._id.toString(), level.userId.name, this.getUpdate().$set.name).then((slug) => {
          this.getUpdate().$set.slug = slug;

          return next();
        }).catch((err) => {
          console.trace(err);

          return next(err);
        });
      })
      .catch((err) => {
        console.trace(err);

        return next(err);
      });
  } else {
    return next();
  }
});

/**
 * Note... There are other ways we can "update" a record in mongo like 'update' 'findOneAndUpdate' and 'updateMany'...
 * But slugs are usually needing to get updated only when the name changes which typically happens one at a time
 * So as long as we use updateOne we should be OK
 * Otherwise we will need to add more helpers or use a library
 * Problem with slug libraries for mongoose is that as of this writing (5/28/22) there seems to be issues importing them with typescript
 */

export default LevelSchema;
