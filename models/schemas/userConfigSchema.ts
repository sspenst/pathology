import { GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import { TourType } from '@root/constants/tourType';
import mongoose from 'mongoose';
import { EmailDigestSettingTypes } from '../../constants/emailDigest';
import UserConfig from '../db/userConfig';

const UserConfigSchema = new mongoose.Schema<UserConfig>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // TODO: Move ALL the calcs to userConfig
    calcRankedSolves: {
      type: Number,
      required: true,
      default: 0,
    },
    calcLevelsCreatedCount: {
      type: Number,
      default: 0,
    },
    calcLevelsSolvedCount: {
      type: Number,
      default: 0,
    },
    calcRecordsCount: {
      type: Number,
      default: 0,
    },
    chapterUnlocked: {
      type: Number,
      default: 1,
    },
    disallowedEmailNotifications: {
      type: [{ type: String, enum: NotificationType }],
      required: true,
      default: [],
    },
    disallowedPushNotifications: {
      type: [{ type: String, enum: NotificationType }],
      required: true,
      default: [],
    },
    gameId: {
      type: String,
      enum: GameId,
      required: true,
    },
    emailDigest: {
      type: String,
      required: true,
      enum: EmailDigestSettingTypes,
      default: EmailDigestSettingTypes.DAILY,
    },
    giftSubscriptions: {
      type: [String],
      required: false,
      select: false,
      default: [],
    },
    mobileDeviceTokens: {
      type: [String],
      required: false,
      select: false,
      default: [],
      maxlength: 100, // max 100 devices @TODO: should probably 'rotate' this list and remove oldest device tokens on push of new one
    },
    showPlayStats: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: {
      type: String,
      required: false,
      select: false,
    },
    theme: {
      type: String,
      required: true,
    },
    /** TODO: MOVE TO user? */
    toursCompleted: {
      type: [{ type: String, enum: TourType }],
      required: false,
      default: [],
    },
    tutorialCompletedAt: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    collation: {
      locale: 'en_US',
      strength: 2,
    },
  }
);

UserConfigSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export default UserConfigSchema;
