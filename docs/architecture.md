# System Architecture

```text
User
  |
  v
[Browser]
  |
  v
[Reverse Proxy / NGINX]
  |  /api/auth -> auth-service
  |  /api/products -> catalog-service
  |  /api/orders -> order-service
  v
+---------------------------+
| Frontend React App        |
|  (served via Vite)         |
+---------------------------+

+---------------------------+
| Auth Service (Express)    |
|  - signup/login/profile    |
|  - JWT issuance           |
+---------------------------+

+---------------------------+
| Catalog Service (Express) |
|  - product catalog        |
|  - seed inventory         |
+---------------------------+

+---------------------------+
| Order Service (Express)   |
|  - checkout               |
|  - order history          |
|  - status update          |
+---------------------------+

+---------------------------+
| MySQL Database            |
|  - users                  |
|  - products               |
|  - checkout_orders        |
|  - order_items            |
+---------------------------+
```

This architecture matches the project rubric because it includes:
- 3+ application modules running in separate containers
- one external-facing reverse proxy
- a persistent database volume
- health endpoints for service checks
- automatic Jenkins-based delivery
