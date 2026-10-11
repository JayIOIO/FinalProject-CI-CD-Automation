Here is the complete `README.md` file customized for your project:

```markdown
# EcomApp for System Architecture

A full-stack e-commerce application built with React, Express, and MySQL. It supports user authentication, product browsing, cart checkout, order history, and profile updates.

## Overview

This project is a simple storefront app designed for learning and system architecture practice. The frontend is built with React + Vite, while the backend exposes a REST API powered by Express and a MySQL database.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Authentication: JWT + bcryptjs
- Database: MySQL
- API client: Axios
- Dev tooling: concurrently

## Project Structure

```text
ecomapp-for-system-architecture-main/
├── backend/
│   ├── node_modules/
│   ├── package-lock.json
│   ├── package.json
│   ├── schema.md
│   └── server.js
├── frontend/
│   ├── node_modules/
│   ├── package-lock.json
│   ├── package.json
│   ├── public/
│   └── src/
├── .gitignore
├── node_modules/
├── package-lock.json
├── package.json
├── README.md
└── .env (local, not committed)
```

> The database schema and seed data live in `backend/schema.md`.

## Features

- User signup and login
- JWT-based protected routes
- Product catalog loaded from MySQL
- Multi-item checkout flow with stock updates
- Order creation and user order history
- Order status updates and deletion
- Profile updates with refreshed JWT token
- Responsive storefront interface

## Prerequisites

Before running the app, make sure you have:

- Node.js 18 or later
- MySQL installed and running locally
- A database named `ecommerce_db` created in MySQL

## Database Setup

Create the database and schema in MySQL:

```sql
CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  stock INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkout_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES checkout_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO products (name, description, price, image_url, stock) VALUES
('Wireless Headphones', 'Noise-canceling over-ear headphones', 99.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 15),
('Smart Watch', 'Fitness tracker with heart rate monitor', 149.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', 8),
('Mechanical Keyboard', 'RGB mechanical gaming keyboard', 79.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500', 20);
```

The same schema is available in `backend/schema.md`.

## Environment Configuration

Create a `.env` file in the `backend` folder:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ecommerce_db
JWT_SECRET=your_super_secret_key
```

If your local MySQL installation does not use a password, leave `DB_PASSWORD` empty.

## Installation

Install the root tool dependencies:

```bash
npm install
```

Then install the frontend and backend dependencies separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Running the App

From the project root, start both services together:

```bash
npm run dev
```

This uses the root `concurrently` script to launch the backend and frontend at the same time.

You can also run them individually:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## API Endpoints

The backend exposes these main routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `PUT /api/auth/profile`
- `GET /api/products`
- `POST /api/products`
- `POST /api/orders`
- `GET /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`

## Notes

- Authenticated requests use a JWT stored in the client after login or signup.
- Input validation is enforced for signups, profile updates, and order creation.
- Keep your local `.env` file out of version control.
- Sample products are seeded in `backend/schema.md` so the store loads with catalog data immediately.

## License

This project is intended for educational and personal development use.
