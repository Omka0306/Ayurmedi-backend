import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export let redisClient;
try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });
} catch(e) {}

const getQueueKey = (hospitalId, branchId, doctorId, date) => `queue:${hospitalId}:${branchId}:${doctorId}:${date}`;

export const getQueue = async (hospitalId, branchId, doctorId, date) => {
  if (!redisClient) return null;
  const key = getQueueKey(hospitalId, branchId, doctorId, date);
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const setQueue = async (hospitalId, branchId, doctorId, date, tokensArray) => {
  if (!redisClient) return;
  const key = getQueueKey(hospitalId, branchId, doctorId, date);
  await redisClient.set(key, JSON.stringify(tokensArray), "EX", 86400);
};

export const recalculateEstimates = (tokensArray, avgConsultMinutes = 15) => {
  let waitingCount = 0;
  return tokensArray.map(token => {
    if (token.status === "WAITING") {
      token.estimatedWaitMinutes = waitingCount * avgConsultMinutes;
      waitingCount++;
    } else {
      token.estimatedWaitMinutes = 0;
    }
    return token;
  });
};

export const rebuildQueue = async (hospitalId, branchId, doctorId, date, tokensArray) => {
  const activeStatuses = ["WAITING", "CALLED", "IN_CONSULTATION"];
  const activeTokens = tokensArray.filter(t => activeStatuses.includes(t.status));
  
  activeTokens.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "IN_CONSULTATION") return -1;
      if (b.status === "IN_CONSULTATION") return 1;
      if (a.status === "CALLED") return -1;
      if (b.status === "CALLED") return 1;
    }

    const pOrder = { "EMERGENCY": 1, "HIGH": 2, "NORMAL": 3 };
    const pA = pOrder[a.priority] || 3;
    const pB = pOrder[b.priority] || 3;
    if (pA !== pB) return pA - pB;
    return a.tokenNumber - b.tokenNumber;
  });

  const updatedQueue = recalculateEstimates(activeTokens);
  await setQueue(hospitalId, branchId, doctorId, date, updatedQueue);
  return updatedQueue;
};

export const closeRedis = async () => {
    if (redisClient) {
        try { await redisClient.disconnect(); } catch(e) {}
    }
};
