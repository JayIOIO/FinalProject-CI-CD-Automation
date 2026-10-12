const mysql = require('mysql2/promise');

const databaseConfig = {
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'app_password',
  database: process.env.DB_NAME || 'ecommerce_db'
};

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [databaseConfig.database, table, column]
  );
  return rows.length > 0;
}

async function indexExists(connection, table, index) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
    [databaseConfig.database, table, index]
  );
  return rows.length > 0;
}

async function constraintExists(connection, table, constraint) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = ? AND table_name = ? AND constraint_name = ?`,
    [databaseConfig.database, table, constraint]
  );
  return rows.length > 0;
}

async function migrate() {
  const connection = await mysql.createConnection(databaseConfig);

  try {
    if (!(await columnExists(connection, 'users', 'role'))) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN role ENUM('buyer', 'seller') NOT NULL DEFAULT 'buyer' AFTER password"
      );
    }

    if (!(await columnExists(connection, 'products', 'seller_id'))) {
      await connection.query('ALTER TABLE products ADD COLUMN seller_id INT NULL AFTER id');
    }
    if (!(await columnExists(connection, 'products', 'category'))) {
      await connection.query(
        "ALTER TABLE products ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'General' AFTER description"
      );
    }
    if (!(await indexExists(connection, 'products', 'idx_products_seller'))) {
      await connection.query('CREATE INDEX idx_products_seller ON products (seller_id)');
    }
    if (!(await indexExists(connection, 'products', 'idx_products_category'))) {
      await connection.query('CREATE INDEX idx_products_category ON products (category)');
    }
    if (!(await indexExists(connection, 'products', 'idx_products_name'))) {
      await connection.query('CREATE INDEX idx_products_name ON products (name)');
    }
    if (!(await constraintExists(connection, 'products', 'fk_products_seller'))) {
      await connection.query(
        'ALTER TABLE products ADD CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL'
      );
    }

    if (!(await columnExists(connection, 'checkout_orders', 'order_number'))) {
      await connection.query('ALTER TABLE checkout_orders ADD COLUMN order_number VARCHAR(40) NULL AFTER id');
    }
    await connection.query(
      "UPDATE checkout_orders SET order_number = CONCAT('ORD-', LPAD(id, 10, '0')) WHERE order_number IS NULL"
    );
    await connection.query(
      'ALTER TABLE checkout_orders MODIFY order_number VARCHAR(40) NOT NULL'
    );
    if (!(await indexExists(connection, 'checkout_orders', 'uq_checkout_orders_order_number'))) {
      await connection.query(
        'CREATE UNIQUE INDEX uq_checkout_orders_order_number ON checkout_orders (order_number)'
      );
    }
    await connection.query(
      "UPDATE checkout_orders SET status = 'Pending' WHERE status IS NULL OR status NOT IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')"
    );
    await connection.query(
      "ALTER TABLE checkout_orders MODIFY status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    );

    if (!(await columnExists(connection, 'order_items', 'seller_id'))) {
      await connection.query('ALTER TABLE order_items ADD COLUMN seller_id INT NULL AFTER product_id');
    }
    await connection.query(
      'UPDATE order_items oi JOIN products p ON p.id = oi.product_id SET oi.seller_id = p.seller_id WHERE oi.seller_id IS NULL AND p.seller_id IS NOT NULL'
    );
    if (!(await columnExists(connection, 'order_items', 'status'))) {
      await connection.query(
        "ALTER TABLE order_items ADD COLUMN status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending'"
      );
    }
    if (!(await indexExists(connection, 'order_items', 'idx_order_items_seller'))) {
      await connection.query('CREATE INDEX idx_order_items_seller ON order_items (seller_id)');
    }
    if (!(await constraintExists(connection, 'order_items', 'fk_items_seller'))) {
      await connection.query(
        'ALTER TABLE order_items ADD CONSTRAINT fk_items_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL'
      );
    }

    const [productForeignKeys] = await connection.execute(
      `SELECT constraint_name AS constraintName FROM information_schema.key_column_usage
       WHERE table_schema = ? AND table_name = 'order_items'
         AND column_name = 'product_id' AND referenced_table_name = 'products'`,
      [databaseConfig.database]
    );
    for (const key of productForeignKeys) {
      if (key.constraintName !== 'fk_items_product') {
        await connection.query(`ALTER TABLE order_items DROP FOREIGN KEY \`${key.constraintName}\``);
      }
    }
    if (!(await constraintExists(connection, 'order_items', 'fk_items_product'))) {
      await connection.query(
        'ALTER TABLE order_items ADD CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT'
      );
    }

    console.log('Marketplace database migration completed successfully.');
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Marketplace database migration failed:', error);
  process.exitCode = 1;
});
