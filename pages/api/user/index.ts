import bcrypt from 'bcrypt';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import { enrichReqUser } from '../../../helpers/enrich';
import { generateCollectionSlug, generateLevelSlug } from '../../../helpers/generateSlug';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import cleanUser from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { CollectionModel, CommentModel, GraphModel, KeyValueModel, LevelModel, MultiplayerProfileModel, NotificationModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { getUserConfig } from '../user-config';

export default withAuth({
  GET: {},
  PUT: {
    body: {
      currentPassword: ValidType('string', false),
      email: ValidType('string', false),
      hideStatus: ValidType('boolean', false),
      name: ValidType('string', false),
      password: ValidType('string', false),
    }
  },
  DELETE: {},
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const [enrichedUser, multiplayerProfile, userConfig] = await Promise.all([
      enrichReqUser(req.user),
      MultiplayerProfileModel.findOne({ 'userId': req.user._id }),
      getUserConfig(req.user._id),
    ]);

    cleanUser(enrichedUser);

    return res.status(200).json({ ...enrichedUser, ...{
      config: userConfig,
      multiplayerProfile: multiplayerProfile,
    } });
  } else if (req.method === 'PUT') {
    await dbConnect();

    const {
      bio,
      currentPassword,
      email,
      hideStatus,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.userId, '+password', { lean: false });

      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({
          error: 'Incorrect email or password',
        });
      }

      user.password = password;
      await user.save();

      return res.status(200).json({ updated: true });
    } else {
      const setObj: {[k: string]: string} = {};

      if (hideStatus !== undefined) {
        setObj['hideStatus'] = hideStatus;
      }

      if (email) {
        setObj['email'] = email.trim();
      }

      if (bio) {
        setObj['bio'] = bio.trim();
      }

      const trimmedName = name?.trim();

      if (trimmedName) {
        setObj['name'] = trimmedName;
      }

      try {
        await UserModel.updateOne({ _id: req.userId }, { $set: setObj }, { runValidators: true });
      } catch (err){
        return res.status(500).json({ error: 'Internal error', updated: false });
      }

      if (trimmedName) {
        // TODO: in extremely rare cases there could be a race condition, might need a transaction here
        const levels = await LevelModel.find<Level>({
          userId: req.userId,
        }, '_id name', { lean: true });

        for (const level of levels) {
          const slug = await generateLevelSlug(trimmedName, level.name, level._id.toString());

          await LevelModel.updateOne({ _id: level._id }, { $set: { slug: slug } });
        }

        // Do the same for collections
        const collections = await CollectionModel.find({
          userId: req.userId,
        }, '_id name', { lean: true });

        for (const collection of collections) {
          const slug = await generateCollectionSlug(trimmedName, collection.name, collection._id.toString());

          await CollectionModel.updateOne({ _id: collection._id }, { $set: { slug: slug } });
        }

        await revalidateUrl(res, RevalidatePaths.CATALOG);
      }

      return res.status(200).json({ updated: true });
    }
  } else if (req.method === 'DELETE') {
    await dbConnect();

    const deletedAt = new Date();

    await Promise.all([
      GraphModel.deleteMany({ $or: [{ source: req.userId }, { target: req.userId }] }),
      // delete in keyvaluemodel where key contains userId
      KeyValueModel.deleteMany({ key: { $regex: `.*${req.userId}.*` } }),
      NotificationModel.deleteMany({ $or: [
        { source: req.userId },
        { target: req.userId },
        { userId: req.userId },
      ] }),
      ReviewModel.deleteMany({ userId: req.userId }),
      StatModel.deleteMany({ userId: req.userId }),
      UserConfigModel.deleteOne({ userId: req.userId }),
      UserModel.deleteOne({ _id: req.userId }),
    ]);

    // delete all comments posted on this user's profile, and all their replies
    await CommentModel.aggregate([
      {
        $match: { $or: [
          { author: req.userId, deletedAt: null },
          { target: req.userId, deletedAt: null },
        ] },
      },
      {
        $set: {
          deletedAt: deletedAt,
        },
      },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'target',
          as: 'children',
          pipeline: [
            {
              $match: {
                deletedAt: null,
              },
            },
            {
              $set: {
                deletedAt: deletedAt,
              },
            },
          ],
        },
      },
    ]);

    res.setHeader('Set-Cookie', clearTokenCookie(req.headers?.host));

    await revalidateUrl(res, RevalidatePaths.CATALOG);

    return res.status(200).json({ updated: true });
  }
});
