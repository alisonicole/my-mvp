// Milestone tracking via localStorage — simple, no backend permissions needed.
// Keys are scoped by userId to support multiple accounts on the same device.

function milestoneKey(userId, milestone) {
  return `between_milestone_${userId}_${milestone}`;
}

export async function hasMilestoneFired(userId, milestone) {
  return localStorage.getItem(milestoneKey(userId, milestone)) === '1';
}

export async function recordMilestoneFired(userId, milestone) {
  localStorage.setItem(milestoneKey(userId, milestone), '1');
}
