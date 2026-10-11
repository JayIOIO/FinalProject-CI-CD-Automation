const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION POOL ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Set your MySQL password in .env or here
  database: process.env.DB_NAME || 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10
});

// --- JWT AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// User Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Simple JS validation
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Invalid signup details' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const token = jwt.sign(
      { id: result.insertId, email, name },
      process.env.JWT_SECRET || 'super_secret_jwt_key',
      { expiresIn: '1d' }
    );

    res.status(201).json({ token, user: { id: result.insertId, name, email } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) return res.status(400).json({ error: 'User not found' });
    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'super_secret_jwt_key',
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. PRODUCT ENDPOINTS
// ==========================================

// READ: Fetch all catalog products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE: Add new product
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, image_url, stock } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, image_url, stock || 10]
    );
    res.status(201).json({ message: 'Product created', productId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. ORDER & CHECKOUT CRUD ENDPOINTS
// ==========================================

// CREATE: Place Checkout Order with Multi-Item Transaction
app.post('/api/orders', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { address, payment_method, total_amount, cartItems } = req.body;

    // 1. Insert Order
    const [orderResult] = await connection.execute(
      `INSERT INTO checkout_orders (customer_name, email, address, payment_method, total_amount, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.name, req.user.email, address, payment_method, total_amount, req.user.id]
    );

    const orderId = orderResult.insertId;

    // 2. Insert items and decrement stock if cart items are present
    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, item.id, item.quantity, item.price]
        );

        await connection.execute(
          `UPDATE products SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.id]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Order placed successfully', orderId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// READ: Get User's Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM checkout_orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE: Update Order Status
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.execute(
      'UPDATE checkout_orders SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, req.user.id]
    );
    res.json({ message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE: Change User Profile Name in MySQL Database
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    // 1. Update user name in MySQL database
    await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);

    // 2. Generate new JWT token with updated name
    const updatedToken = jwt.sign(
      { id: req.user.id, email: req.user.email, name },
      process.env.JWT_SECRET || 'super_secret_jwt_key',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Profile updated successfully',
      token: updatedToken,
      user: { id: req.user.id, name, email: req.user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Cancel/Delete Order
app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'DELETE FROM checkout_orders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});