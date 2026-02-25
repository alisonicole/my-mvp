// All engagement messages are generated via Back4App cloud function
// so the Anthropic API key stays on the server.

const Parse = () => window.Parse;

function formatEntries(entries) {
  return entries
    .map((e, i) => `Entry ${i + 1} (${new Date(e.timestamp).toLocaleDateString()}): ${e.text}`)
    .join('\n\n');
}

export async function getEntry1Message(entry) {
  const result = await Parse().Cloud.run('getEngagementMessage', {
    type: 'entry1',
    entries: [{ text: entry.text, timestamp: entry.timestamp }],
  });
  return result.message;
}

export async function getEntry2Message(entries) {
  const result = await Parse().Cloud.run('getEngagementMessage', {
    type: 'entry2',
    entries: entries.map(e => ({ text: e.text, timestamp: e.timestamp })),
  });
  return result.message;
}

export async function getEntry3Message(entries) {
  const result = await Parse().Cloud.run('getEngagementMessage', {
    type: 'entry3',
    entries: entries.map(e => ({ text: e.text, timestamp: e.timestamp })),
  });
  return result.message;
}

export async function getEntry5MilestoneMessage(entries) {
  const result = await Parse().Cloud.run('getEngagementMessage', {
    type: 'entry5',
    entries: entries.map(e => ({ text: e.text, timestamp: e.timestamp })),
  });
  return result.message;
}

export async function getSessionSnapshotMessage(entries, prepNotes) {
  const result = await Parse().Cloud.run('getEngagementMessage', {
    type: 'sessionSnapshot',
    entries: entries.map(e => ({ text: e.text, timestamp: e.timestamp })),
    prepNotes: prepNotes || '',
  });
  return result.message;
}
