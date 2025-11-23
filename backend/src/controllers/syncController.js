const offlineSync = require('../services/offlineSync');

exports.syncOfflineChanges = async (req, res, next) => {
  try {
    const { operations } = req.body;
    const userId = req.user.id;

    const results = await offlineSync.syncOfflineChanges(userId, operations);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};
