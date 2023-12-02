import { GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import { TourType } from '@root/hooks/useTour';
import { Types } from 'mongoose';
import EmailDigestSettingTypes from '../../constants/emailDigest';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  disallowedEmailNotifications: NotificationType[];
  disallowedPushNotifications: NotificationType[];
  gameId: GameId;
  //emailConfirmationToken: string;
  //emailConfirmed: boolean;
  emailDigest: EmailDigestSettingTypes;
  giftSubscriptions: string[]; // gift subscriptions this user has given out
  mobileDeviceTokens: string[];
  showPlayStats: boolean;
  stripeCustomerId: string;
  theme: string;
  toursCompleted: TourType[];
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId | User;
}

export default UserConfig;
