// Uses Parse (global window.Parse) to persist which milestones have fired for each user

export async function hasMilestoneFired(userId, milestone) {
  const Parse = window.Parse;
  const query = new Parse.Query('UserMilestone');
  query.equalTo('userId', userId);
  query.equalTo('milestone', milestone);
  const result = await query.first();
  return !!result;
}

export async function recordMilestoneFired(userId, milestone) {
  const Parse = window.Parse;
  const UserMilestone = Parse.Object.extend('UserMilestone');
  const record = new UserMilestone();
  record.set('userId', userId);
  record.set('milestone', milestone);
  await record.save();
}
