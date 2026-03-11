# TradeDesk — AWS Deployment Guide

## Architecture Overview
```
Internet → ALB (Load Balancer) → EC2 (Node.js App) → SQLite (local file on EBS)
```
For production scale, replace SQLite with RDS PostgreSQL (see notes below).

---

## Prerequisites
- AWS account with IAM user (AdministratorAccess or scoped permissions)
- AWS CLI installed and configured (`aws configure`)
- Node.js 20+ on your local machine

---

## Step 1: Build the frontend

```bash
cd frontend
npm install
npm run build
# Output: frontend/dist/
```

## Step 2: Prepare backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set a strong JWT_SECRET
```

## Step 3: Launch EC2 Instance

**Recommended:** Ubuntu 22.04 LTS, t3.small (or larger for production)

From AWS Console:
1. EC2 → Launch Instance
2. Select: Ubuntu Server 22.04 LTS (x86_64)
3. Instance type: t3.small
4. Key pair: create or use existing .pem
5. Security Group — open inbound:
   - Port 22  (SSH)    from your IP
   - Port 80  (HTTP)   from 0.0.0.0/0
   - Port 443 (HTTPS)  from 0.0.0.0/0
   - Port 5000 (API)   from 0.0.0.0/0 (or lock to ALB only)
6. Storage: 20 GB gp3
7. Launch

## Step 4: Connect & install dependencies

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx
```

## Step 5: Deploy code

```bash
# From your local machine — copy project to EC2
scp -i your-key.pem -r ./stock-trading ubuntu@<EC2-PUBLIC-IP>:~/

# On EC2
cd ~/stock-trading/backend
npm install --production

# Seed the database
node scripts/seed.js

# Start with PM2
pm2 start server.js --name tradedesk
pm2 startup
pm2 save
```

## Step 6: Nginx config (reverse proxy + serve React)

```bash
sudo nano /etc/nginx/sites-available/tradedesk
```

Paste:
```nginx
server {
    listen 80;
    server_name _;          # Replace _ with your domain

    # Serve React static files
    root /home/ubuntu/stock-trading/frontend/dist;
    index index.html;

    # React client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tradedesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: HTTPS with Let's Encrypt (if you have a domain)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Step 8: Set environment variables on EC2

```bash
nano ~/stock-trading/backend/.env
```

```
PORT=5000
JWT_SECRET=your_very_long_random_secret_here
JWT_EXPIRES_IN=24h
NODE_ENV=production
DB_PATH=./data/trading.db
PRICE_UPDATE_INTERVAL_MS=30000
FRONTEND_URL=https://yourdomain.com
```

```bash
pm2 restart tradedesk
```

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | 5000 |
| `JWT_SECRET` | Secret for signing tokens — **change this!** | — |
| `JWT_EXPIRES_IN` | Token lifetime | 24h |
| `NODE_ENV` | Environment | development |
| `DB_PATH` | SQLite file path | ./data/trading.db |
| `PRICE_UPDATE_INTERVAL_MS` | How often prices update (ms) | 30000 |
| `FRONTEND_URL` | Allowed CORS origin | * |

---

## Scaling to RDS PostgreSQL (optional)

If you outgrow SQLite:
1. Create RDS PostgreSQL instance in same VPC as EC2
2. Replace `better-sqlite3` with `pg` + `knex` or `drizzle-orm`
3. Update all `db.prepare()` calls to parameterized pg queries
4. Add `DATABASE_URL` env var

---

## Default Credentials (seed data)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin1234!` |
| Demo Customer | `demo` | `Demo1234!` |

**Change these immediately in production.**
