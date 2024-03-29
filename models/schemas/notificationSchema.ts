import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import NotificationType from '../../constants/notificationType';
import Notification from '../db/notification';

const NotificationSchema = new mongoose.Schema<Notification>({
  gameId: {
    type: String,
    enum: GameId,
    required: true,
  },
  message: {
    type: String,
    required: false,
    default: '',
  },
  read: {
    type: Boolean,
    required: true,
    default: false,
  },
  source: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel',
    required: false,
  },
  sourceModel: {
    type: String,
    required: false,
    enum: ['User', 'Level', 'Achievement'],
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: false,
  },
  targetModel: {
    type: String,
    required: false,
    enum: ['User', 'Level', 'Collection'],
  },
  type: {
    type: String,
    enum: NotificationType,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

NotificationSchema.index({ userId: 1, createdAt: -1, read: 1 });

export default NotificationSchema;
