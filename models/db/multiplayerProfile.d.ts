interface MultiplayerProfile {

  // elo
  calc_RushBullet_count: number;
  calc_RushBlitz_count: number;
  calc_RushRapid_count: number;
  calc_RushClassical_count: number;

  ratingRushBullet: number;
  ratingRushBlitz: number;
  ratingRushRapid: number;
  ratingRushClassical: number;

  ratingDeviation: number;
  userId: Types.ObjectId & User;
  volatility: number;
}

// add unique index for userId and type
MultiplayerProfileSchema.index({ userId: 1 }, { unique: true });
export default MultiplayerProfile;
