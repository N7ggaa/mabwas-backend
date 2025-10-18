const gameController = require('./gameController');

exports.get = (req, res) => {
  res.json({ leaderboard: gameController._getLeaderboard() });
};
