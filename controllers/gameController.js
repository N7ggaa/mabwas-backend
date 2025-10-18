const { query, getClient } = require('../config/database');

exports.start = async (req, res) => {
  try {
    const { gameMode, difficulty } = req.body;
    const userId = req.user?.userId;

    if (!gameMode) {
      return res.status(400).json({ error: 'Game mode is required' });
    }

    // Create game session
    const result = await query(
      'INSERT INTO game_sessions (user_id, game_mode, difficulty) VALUES ($1, $2, $3) RETURNING id',
      [userId, gameMode, difficulty || 'medium']
    );

    res.json({
      message: 'Game session started',
      sessionId: result.rows[0].id,
      startTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Game start error:', error);
    res.status(500).json({ error: 'Failed to start game session' });
  }
};

exports.end = async (req, res) => {
  try {
    const { sessionId, score, duration } = req.body;
    const userId = req.user?.userId;

    if (!sessionId || score === undefined) {
      return res.status(400).json({ error: 'Session ID and score are required' });
    }

    // Update game session
    const updateResult = await query(
      'UPDATE game_sessions SET score = $1, duration = $2, end_time = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING id',
      [score, duration || 0, sessionId, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    // Update leaderboard if user exists
    if (userId) {
      const userResult = await query('SELECT username FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        const username = userResult.rows[0].username;

        // Insert or update leaderboard entry
        await query(`
          INSERT INTO leaderboard (user_id, username, best_score, total_games, total_playtime, last_played)
          VALUES ($1, $2, $3, 1, $4, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id) DO UPDATE SET
            best_score = GREATEST(leaderboard.best_score, EXCLUDED.best_score),
            total_games = leaderboard.total_games + 1,
            total_playtime = leaderboard.total_playtime + EXCLUDED.total_playtime,
            last_played = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [userId, username, score, duration || 0]);
      }
    }

    res.json({
      message: 'Game session ended',
      sessionId: sessionId,
      finalScore: score,
      duration: duration || 0
    });
  } catch (error) {
    console.error('Game end error:', error);
    res.status(500).json({ error: 'Failed to end game session' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get top scores from leaderboard
    const leaderboardResult = await query(`
      SELECT username, best_score as score, total_games, last_played
      FROM leaderboard
      ORDER BY best_score DESC
      LIMIT $1
    `, [limit]);

    const leaderboard = leaderboardResult.rows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      score: parseInt(row.score),
      total_games: parseInt(row.total_games),
      last_played: row.last_played
    }));

    res.json({
      message: 'Leaderboard retrieved',
      leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user stats from database
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_games,
        COALESCE(SUM(score), 0) as total_score,
        COALESCE(AVG(score), 0) as average_score,
        COALESCE(MAX(score), 0) as best_score,
        COALESCE(SUM(duration), 0) as total_playtime
      FROM game_sessions
      WHERE user_id = $1
    `, [userId]);

    const stats = statsResult.rows[0];

    res.json({
      stats: {
        total_games: parseInt(stats.total_games),
        total_score: parseInt(stats.total_score),
        average_score: parseFloat(stats.average_score),
        best_score: parseInt(stats.best_score),
        total_playtime: parseInt(stats.total_playtime)
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
};

exports.getUserPersonalBests = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's personal bests
    const personalBestsResult = await query(`
      SELECT best_score, total_games, total_playtime, last_played
      FROM leaderboard
      WHERE user_id = $1
    `, [userId]);

    const personalBests = personalBestsResult.rows[0] || {
      best_score: 0,
      total_games: 0,
      total_playtime: 0,
      last_played: null
    };

    res.json({
      personalBests: {
        best_score: parseInt(personalBests.best_score),
        total_games: parseInt(personalBests.total_games),
        total_playtime: parseInt(personalBests.total_playtime),
        last_played: personalBests.last_played
      }
    });
  } catch (error) {
    console.error('Get personal bests error:', error);
    res.status(500).json({ error: 'Failed to retrieve personal bests' });
  }
};
