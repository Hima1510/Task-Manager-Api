const NodeCache = require('node-cache');

// Cache data is process-local and expires after one minute by default.
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const stats = { hits: 0, misses: 0 };

function getCache(key) {
  if (cache.has(key)) {
    stats.hits += 1;
    return { hit: true, value: cache.get(key) };
  }

  stats.misses += 1;
  return { hit: false, value: undefined };
}

function invalidateUserTasks(userId, taskId) {
  cache.del(`tasks:list:${userId}`);
  if (taskId) cache.del(`tasks:item:${userId}:${taskId}`);
}

module.exports = { cache, getCache, invalidateUserTasks, stats };
