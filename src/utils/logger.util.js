/* Simple JSON logger – can be swapped with a more advanced solution later */

const base = {
  service: 'ayurmedi-backend',
};

const log = (level, message, meta = {}) => {
  // Avoid circular JSON issues
  const safeMeta = {};
  Object.keys(meta || {}).forEach((k) => {
    try {
      // eslint-disable-next-line no-void
      void JSON.stringify(meta[k]);
      safeMeta[k] = meta[k];
    } catch {
      safeMeta[k] = String(meta[k]);
    }
  });

  console.log(
    JSON.stringify({
      ...base,
      level,
      message,
      ...safeMeta,
      timestamp: new Date().toISOString(),
    }),
  );
};

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

