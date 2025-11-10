const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        service VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

initDatabase();

// === AUTH ROUTES ===

// Login or Register
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password richiesti' });
  }

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) {
      // Register new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );
      return res.json({ success: true, user: newUser.rows[0], message: 'Account creato con successo!' });
    } else {
      // Login existing user
      const user = userResult.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Password errata' });
      }

      return res.json({ success: true, user: { id: user.id, username: user.username } });
    }
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// === TRANSACTION ROUTES ===

// Get all transactions for user
app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Errore nel recupero delle transazioni' });
  }
});

// Add transaction
app.post('/api/transactions', async (req, res) => {
  const { user_id, description, amount, type, category, date } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO transactions (user_id, description, amount, type, category, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, description, amount, type, category, date]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta della transazione' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della transazione' });
  }
});

// === CREDENTIAL ROUTES ===

// Get all credentials for user
app.get('/api/credentials/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM credentials WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Errore nel recupero delle credenziali' });
  }
});

// Add credential
app.post('/api/credentials', async (req, res) => {
  const { user_id, service, email, password, notes } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO credentials (user_id, service, email, password, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, service, email, password, notes]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding credential:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta della credenziale' });
  }
});

// Delete credential
app.delete('/api/credentials/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM credentials WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della credenziale' });
  }
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Chaset server running on port ${port}`);
});