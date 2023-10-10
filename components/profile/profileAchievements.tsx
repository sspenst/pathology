import AchievementRulesCreator from '@root/constants/achievements/AchievementRulesCreator';
import AchievementRulesMultiplayer from '@root/constants/achievements/AchievementRulesMultiplayer';
import AchievementRulesProgress from '@root/constants/achievements/AchievementRulesProgress';
import AchievementRulesReviewer from '@root/constants/achievements/AchievementRulesReviewer';
import AchievementRulesSkill from '@root/constants/achievements/AchievementRulesSkill';
import AchievementType from '@root/constants/achievements/achievementType';
import Achievement from '@root/models/db/achievement';
import React from 'react';
import FormattedAchievement from '../formatted/formattedAchievement';

export function ProfileAchievments({ achievements }: { achievements: Achievement[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getAchievementsOfCategory(rule: any) {
    return Object.keys(rule).map(achievementType => {
      const achievement = achievements.find(achievement => achievement.type === achievementType);

      return (
        <FormattedAchievement
          achievementType={achievementType as AchievementType}
          createdAt={achievement?.createdAt}
          key={`achievement-${achievementType}`}
        />
      );
    }).filter(achievement => achievement !== null);
  }

  const achievementsByCategory = {
    'Progress': getAchievementsOfCategory(AchievementRulesProgress),
    'Creator': getAchievementsOfCategory(AchievementRulesCreator),
    'Skill': getAchievementsOfCategory(AchievementRulesSkill),
    'Reviewer': getAchievementsOfCategory(AchievementRulesReviewer),
    'Multiplayer': getAchievementsOfCategory(AchievementRulesMultiplayer),
  } as { [key: string]: JSX.Element[] };

  return (
    <div className='flex flex-wrap gap-6 justify-center p-3'>
      {Object.keys(achievementsByCategory).map((achievementCategory) => (
        <div className='flex flex-col gap-4 w-60 max-w-full' key={achievementCategory}>
          <h1 className='text-2xl font-medium '>{achievementCategory}</h1>
          {achievementsByCategory[achievementCategory]}
        </div>
      ))}
    </div>
  );
}
