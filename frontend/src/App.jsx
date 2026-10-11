import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [isSignup, setIsSignup] = useState(false);
  const [activeTab, setActiveTab] = useState('shop');

  // App Data
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);

  // Forms
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [checkoutData, setCheckoutData] = useState({ address: '', payment_method: 'Credit Card' });
  const [profileData, setProfileData] = useState({ name: '', password: '' });

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchProducts();
    if (token) {
      fetchOrders();
      if (user) setProfileData({ name: user.name, password: '' });
    }
  }, [token]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`, authConfig);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // --- CART MANAGERS ---
  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map((item) => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- ORDER CRUD ---
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}`, { status: newStatus }, authConfig);
      fetchOrders();
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel and delete this order?')) return;
    try {
      await axios.delete(`${API_URL}/orders/${orderId}`, authConfig);
      fetchOrders();
    } catch (err) {
      alert('Failed to delete order');
    }
  };

 // --- PROFILE MANAGEMENT (CHANGE NAME IN DATABASE) ---
const handleUpdateProfile = async (e) => {
  e.preventDefault();
  if (!profileData.name.trim()) return alert('Name cannot be empty');

  try {
    // Send PUT request to Express backend
    const res = await axios.put(
      `${API_URL}/auth/profile`,
      { name: profileData.name },
      authConfig
    );

    // Save updated token & user in React state and localStorage
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);

    alert('Name successfully updated in database!');
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update profile name');
  }
};

  // --- AUTH & CHECKOUT ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isSignup ? `${API_URL}/auth/signup` : `${API_URL}/auth/login`;
    try {
      const res = await axios.post(endpoint, authData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      setProfileData({ name: res.data.user.name, password: '' });
      setAuthData({ name: '', email: '', password: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUser(null);
    setCart([]);
    setOrders([]);
    setActiveTab('shop');
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutData.address.trim()) return alert('Please enter shipping address');

    try {
      await axios.post(
        `${API_URL}/orders`,
        {
          address: checkoutData.address,
          payment_method: checkoutData.payment_method,
          total_amount: cartTotal.toFixed(2),
          cartItems: cart
        },
        authConfig
      );
      alert('🎉 Order Placed Successfully!');
      setCart([]);
      setCheckoutData({ address: '', payment_method: 'Credit Card' });
      fetchOrders();
      fetchProducts();
      setActiveTab('orders');
    } catch (err) {
      alert('Checkout failed: ' + (err.response?.data?.error || 'Error processing request'));
    }
  };

  // --- AUTHENTICATION VIEW ---
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🛍 Shopee Clone</h1>
            <p>{isSignup ? 'Create your new account' : 'Log in to start shopping'}</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            {isSignup && (
              <input
                className="auth-input"
                placeholder="Full Name"
                value={authData.name}
                onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                required
              />
            )}
            <input
              type="email"
              className="auth-input"
              placeholder="Email Address"
              value={authData.email}
              onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
              required
            />
            <input
              type="password"
              className="auth-input"
              placeholder="Password"
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              required
            />
            <button type="submit" className="auth-button">
              {isSignup ? 'Sign Up' : 'Log In'}
            </button>
          </form>
          <div className="auth-toggle-container">
            <button onClick={() => setIsSignup(!isSignup)} className="auth-toggle-btn">
              {isSignup ? 'Existing user? Log In' : "New to Shopee? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STORE FRONTEND VIEW ---
  return (
    <div>
      {/* Header */}
      <header className="shopee-header">
        <div className="header-container">
          <h2 className="brand-title" onClick={() => setActiveTab('shop')}>
            🛍️ <span>Shopee</span>
          </h2>
          <div className="user-info">
            <span>Welcome, <strong>{user?.name}</strong></span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="shopee-nav">
        <div className="nav-container">
          {[
            { id: 'shop', label: 'Mall Products' },
            { id: 'cart', label: `My Cart (${cart.reduce((s, i) => s + i.quantity, 0)})` },
            { id: 'orders', label: `My Orders (${orders.length})` },
            { id: 'profile', label: 'My Account Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <main className="main-container">
        
        {/* VIEW 1: PRODUCTS CATALOG */}
        {activeTab === 'shop' && (
          <div className="product-grid">
            {products.map((prod) => (
              <div key={prod.id} className="product-card">
                <img src={prod.image_url} alt={prod.name} className="product-image" />
                <div className="product-details">
                  <div>
                    <h4 className="product-title">{prod.name}</h4>
                    <p className="product-desc">{prod.description}</p>
                  </div>
                  <div className="product-footer">
                    <span className="product-price">${parseFloat(prod.price).toFixed(2)}</span>
                    <button onClick={() => addToCart(prod)} className="btn-add-cart">
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: CART & CHECKOUT */}
        {activeTab === 'cart' && (
          <div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Your shopping cart is currently empty.</p>
                <button onClick={() => setActiveTab('shop')} className="btn-submit" style={{ marginTop: '15px' }}>
                  Go Shopping Now
                </button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-card">
                  <h3 className="card-title">Cart Items</h3>
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div style={{ flex: 2 }}>
                        <h4 style={{ fontSize: '14px' }}>{item.name}</h4>
                        <small style={{ color: '#888' }}>${parseFloat(item.price).toFixed(2)}</small>
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn">-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn">+</button>
                      </div>
                      <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#ee4d2d' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="btn-remove">✕</button>
                    </div>
                  ))}
                </div>

                <div className="checkout-card">
                  <h3 className="card-title">Checkout</h3>
                  <div className="checkout-total">
                    <span>Total Pay:</span>
                    <span style={{ color: '#ee4d2d' }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  <form onSubmit={handleCheckoutSubmit} className="checkout-form">
                    <label className="form-label">SHIPPING ADDRESS</label>
                    <textarea
                      rows="3"
                      className="form-textarea"
                      placeholder="Street, City, Zip Code..."
                      value={checkoutData.address}
                      onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                      required
                    />

                    <label className="form-label">PAYMENT METHOD</label>
                    <select
                      className="form-select"
                      value={checkoutData.payment_method}
                      onChange={(e) => setCheckoutData({ ...checkoutData, payment_method: e.target.value })}
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                    </select>

                    <button type="submit" className="btn-submit">
                      Place Order
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ORDER HISTORY */}
        {activeTab === 'orders' && (
          <div className="orders-card">
            <h3 className="card-title">Order History (CRUD Operations)</h3>
            {orders.length === 0 ? (
              <p style={{ color: '#888' }}>No order records found.</p>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-item-card">
                    <div>
                      <h4 style={{ margin: '0 0 5px 0' }}>Order #{order.id}</h4>
                      <p style={{ fontSize: '13px', color: '#555' }}>Address: {order.address}</p>
                      <p style={{ fontSize: '13px', color: '#555' }}>Payment: {order.payment_method}</p>
                      <strong style={{ color: '#ee4d2d', fontSize: '16px' }}>Total: ${parseFloat(order.total_amount).toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '2px' }}>STATUS (UPDATE)</label>
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="order-select"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '2px' }}>ACTION (DELETE)</label>
                        <button onClick={() => handleDeleteOrder(order.id)} className="btn-danger">
                          Cancel / Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: MY ACCOUNT PROFILE */}
        {activeTab === 'profile' && (
          <div className="profile-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3 className="card-title">Account Settings</h3>
            <form onSubmit={handleUpdateProfile} className="checkout-form">
              <div>
                <label className="form-label">Email Address (Read-only)</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="form-input"
                  style={{ background: '#f5f5f5', border: '1px solid #eee' }}
                />
              </div>

              <div>
                <label className="form-label">Full Name (CHANGE NAME)</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <button type="submit" className="btn-submit">
                Save Profile Changes
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}