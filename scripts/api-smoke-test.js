const baseUrl = process.env.BASE_URL || 'http://localhost';

async function request(path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), options);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function main() {
  const products = await request('/api/products');
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('The catalog API did not return any products');
  }

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const buyerSignup = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pipeline Buyer',
      email: `buyer-${suffix}@example.com`,
      password: 'smoke-test-password',
      role: 'buyer'
    })
  });

  const sellerSignup = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pipeline Seller',
      email: `seller-${suffix}@example.com`,
      password: 'smoke-test-password',
      role: 'seller'
    })
  });

  const secondSellerSignup = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pipeline Second Seller',
      email: `seller-two-${suffix}@example.com`,
      password: 'smoke-test-password',
      role: 'seller'
    })
  });

  if (!buyerSignup.token || buyerSignup.user.role !== 'buyer' ||
      !sellerSignup.token || sellerSignup.user.role !== 'seller' ||
      !secondSellerSignup.token || secondSellerSignup.user.role !== 'seller') {
    throw new Error('Buyer and seller registration did not return the expected roles and tokens');
  }

  const inventoryResponse = await fetch(new URL('/api/products/mine', baseUrl), {
    headers: { Authorization: `Bearer ${buyerSignup.token}` }
  });
  if (inventoryResponse.status !== 403) {
    throw new Error(`Buyer inventory access should be forbidden; received ${inventoryResponse.status}`);
  }

  const newProduct = await request('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sellerSignup.token}`
    },
    body: JSON.stringify({
      name: `Smoke Product ${suffix}`,
      description: 'Temporary product created by integration test',
      category: 'SmokeTest',
      price: 12.34,
      image_url: '',
      stock: 5
    })
  });

  if (!newProduct.productId) {
    throw new Error('Seller product creation did not return a product ID');
  }

  const secondSellerProduct = await request('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondSellerSignup.token}`
    },
    body: JSON.stringify({
      name: `Second Seller Product ${suffix}`,
      description: 'Another seller-owned integration-test product',
      category: 'SmokeTest',
      price: 7.89,
      image_url: '',
      stock: 5
    })
  });

  if (!secondSellerProduct.productId) {
    throw new Error('Second seller product creation did not return a product ID');
  }

  const wrongOwnerUpdate = await fetch(new URL(`/api/products/${newProduct.productId}`, baseUrl), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondSellerSignup.token}`
    },
    body: JSON.stringify({
      name: 'Stolen Listing',
      description: '',
      category: 'SmokeTest',
      price: 1,
      image_url: '',
      stock: 1
    })
  });
  if (wrongOwnerUpdate.status !== 404) {
    throw new Error(`Seller must not update another seller's product; received ${wrongOwnerUpdate.status}`);
  }

  const searchResults = await request(`/api/products?search=${encodeURIComponent(suffix)}&category=SmokeTest`);
  if (!searchResults.some((product) => product.id === newProduct.productId) ||
      !searchResults.some((product) => product.id === secondSellerProduct.productId)) {
    throw new Error('Product keyword/category search did not find both seller listings');
  }

  const buyerWriteResponse = await fetch(new URL('/api/products', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerSignup.token}`
    },
    body: JSON.stringify({ name: 'Unauthorized product', category: 'SmokeTest', price: 1, stock: 1 })
  });
  if (buyerWriteResponse.status !== 403) {
    throw new Error(`Buyer product creation should be forbidden; received ${buyerWriteResponse.status}`);
  }

  const order = await request('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerSignup.token}`
    },
    body: JSON.stringify({
      address: '1 Pipeline Test Road',
      payment_method: 'test',
      total_amount: 0.01,
      cartItems: [
        { id: newProduct.productId, quantity: 1, price: 0.01 },
        { id: secondSellerProduct.productId, quantity: 1, price: 0.01 }
      ]
    })
  });

  if (!order.orderId || !/^ORD-[A-F0-9]{32}$/.test(order.orderNumber) || order.totalAmount !== 20.23) {
    throw new Error('Order API did not return a unique ID and server-calculated total');
  }

  const sellerOrders = await request('/api/orders/seller', {
    headers: { Authorization: `Bearer ${sellerSignup.token}` }
  });
  if (!sellerOrders.some((entry) => entry.order_number === order.orderNumber)) {
    throw new Error('Seller order list did not include the seller-owned product order');
  }
  const secondSellerOrders = await request('/api/orders/seller', {
    headers: { Authorization: `Bearer ${secondSellerSignup.token}` }
  });
  if (!secondSellerOrders.some((entry) => entry.order_number === order.orderNumber)) {
    throw new Error('Second seller order list did not include its own product in the order');
  }

  await request(`/api/orders/${order.orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sellerSignup.token}`
    },
    body: JSON.stringify({ status: 'Processing' })
  });

  await request(`/api/orders/${order.orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondSellerSignup.token}`
    },
    body: JSON.stringify({ status: 'Shipped' })
  });

  const orders = await request('/api/orders', {
    headers: { Authorization: `Bearer ${buyerSignup.token}` }
  });

  const createdOrder = orders.find((entry) => entry.id === order.orderId);
  if (!createdOrder || createdOrder.order_number !== order.orderNumber ||
      createdOrder.status !== 'Processing' || createdOrder.total_amount !== '20.23' ||
      !createdOrder.items.some((item) => item.product_id === newProduct.productId && item.status === 'Processing') ||
      !createdOrder.items.some((item) => item.product_id === secondSellerProduct.productId && item.status === 'Shipped')) {
    throw new Error('Buyer order history did not reflect the created order and seller status update');
  }

  console.log(`Marketplace smoke test passed: buyer/seller roles, listing ownership, search, multi-seller order ${order.orderNumber}, per-seller fulfillment status`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
