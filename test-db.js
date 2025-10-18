const { connectDB, query } = require('./config/database');

async function testDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();

    console.log('✅ Database connected successfully');

    // Test user creation
    console.log('🧪 Testing user creation...');
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'hashedpassword123';
    const testUsername = 'testuser';

    const userResult = await query(
      'INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id, email, username',
      [testEmail, testPassword, testUsername]
    );

    console.log('✅ User created:', userResult.rows[0]);

    // Test user retrieval
    console.log('🧪 Testing user retrieval...');
    const userLookup = await query('SELECT * FROM users WHERE email = $1', [testEmail]);
    console.log('✅ User found:', userLookup.rows[0]);

    // Test game session creation
    console.log('🧪 Testing game session creation...');
    const sessionResult = await query(
      'INSERT INTO game_sessions (user_id, game_mode, difficulty) VALUES ($1, $2, $3) RETURNING id',
      [userResult.rows[0].id, 'classic', 'medium']
    );
    console.log('✅ Game session created:', sessionResult.rows[0]);

    // Test leaderboard update
    console.log('🧪 Testing leaderboard update...');
    await query(`
      INSERT INTO leaderboard (user_id, username, best_score, total_games, total_playtime, last_played)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        best_score = GREATEST(leaderboard.best_score, EXCLUDED.best_score),
        total_games = leaderboard.total_games + 1,
        total_playtime = leaderboard.total_playtime + EXCLUDED.total_playtime,
        last_played = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [userResult.rows[0].id, testUsername, 1000, 1, 120]);

    console.log('✅ Leaderboard updated');

    // Test leaderboard retrieval
    console.log('🧪 Testing leaderboard retrieval...');
    const leaderboardResult = await query(`
      SELECT username, best_score as score, total_games, last_played
      FROM leaderboard
      ORDER BY best_score DESC
      LIMIT 5
    `);

    console.log('✅ Leaderboard retrieved:', leaderboardResult.rows);

    console.log('🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();