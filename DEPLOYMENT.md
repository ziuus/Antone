# Production Deployment Guide

## Quick Start

This guide will help you deploy the Antone MobileBridge Extension and Mobile App to production.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Python 3.8+
- Node.js 18+
- Java 17 (for Android builds)
- Nginx
- SSL certificates (Let's Encrypt recommended)

---

## Extension Deployment

### 1. Prepare Environment

```bash
# Create production environment file
cp extension/.env.production.template extension/.env.production

# Edit and fill in production values
nano extension/.env.production
```

**Important values to configure:**
- `JWT_SECRET`: Generate with `openssl rand -hex 32`
- `API_KEY_ENCRYPTION_KEY`: Generate with `openssl rand -hex 32`
- `ALLOWED_ORIGINS`: Your production domains
- `SENTRY_DSN`: Your Sentry project DSN (optional)

### 2. Deploy Extension

```bash
# Run deployment script as root
sudo ./extension/deploy-production.sh
```

This script will:
- Create system user
- Install dependencies
- Set up systemd service
- Start the service

### 3. Configure Nginx

```bash
# Copy nginx configuration
sudo cp extension/nginx-antone.conf /etc/nginx/sites-available/antone
sudo ln -s /etc/nginx/sites-available/antone /etc/nginx/sites-enabled/

# Update domain names in the config
sudo nano /etc/nginx/sites-enabled/antone

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Set Up SSL

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com
```

### 5. Verify Deployment

```bash
# Check service status
sudo systemctl status antone-mobilebridge

# View logs
sudo journalctl -u antone-mobilebridge -f

# Test API
curl https://api.yourdomain.com/health
```

---

## Mobile App Deployment

### 1. Configure Environment

```bash
# Edit production environment
nano mobile_app/.env.production
```

Update:
- `VITE_API_BASE_URL`: Your production API URL
- `VITE_WS_URL`: Your production WebSocket URL

### 2. Build Release APK

```bash
cd mobile_app
./build-release.sh
```

The script will generate:
- `release/antone-debug.apk` - For testing
- `release/antone-release-unsigned.apk` - For signing

### 3. Sign the APK

#### Create Keystore (first time only)

```bash
keytool -genkey -v -keystore antone-release.keystore \
  -alias antone -keyalg RSA -keysize 2048 -validity 10000
```

#### Sign APK

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore antone-release.keystore \
  release/antone-release-unsigned.apk antone
```

#### Align APK

```bash
zipalign -v 4 release/antone-release-unsigned.apk \
  release/antone-release.apk
```

### 4. Verify APK

```bash
jarsigner -verify -verbose -certs release/antone-release.apk
```

### 5. Deploy to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new application
3. Upload `release/antone-release.apk`
4. Fill in store listing details
5. Submit for review

---

## Monitoring & Maintenance

### Extension Logs

```bash
# Real-time logs
sudo journalctl -u antone-mobilebridge -f

# Last 100 lines
sudo journalctl -u antone-mobilebridge -n 100

# Logs from today
sudo journalctl -u antone-mobilebridge --since today
```

### Service Management

```bash
# Restart service
sudo systemctl restart antone-mobilebridge

# Stop service
sudo systemctl stop antone-mobilebridge

# Check status
sudo systemctl status antone-mobilebridge
```

### Update Deployment

```bash
# Pull latest code
cd /opt/antone
git pull

# Restart service
sudo systemctl restart antone-mobilebridge
```

---

## Security Checklist

- [ ] Changed all default secrets in `.env.production`
- [ ] SSL/TLS certificates installed and auto-renewing
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] Rate limiting enabled in nginx
- [ ] Regular backups configured
- [ ] Monitoring/alerting set up (Sentry, etc.)
- [ ] APK signed with production keystore
- [ ] Keystore backed up securely

---

## Troubleshooting

### Extension won't start

```bash
# Check logs for errors
sudo journalctl -u antone-mobilebridge -n 50

# Common issues:
# - Missing .env.production file
# - Invalid JWT_SECRET
# - Port already in use
```

### Mobile app can't connect

- Verify API URL in `.env.production`
- Check CORS settings in extension
- Verify SSL certificates are valid
- Test API endpoint: `curl https://api.yourdomain.com/health`

### Build failures

- Ensure Java 17 is installed and `JAVA_HOME` is set
- Clear Gradle cache: `cd android && ./gradlew clean`
- Check Android SDK is installed

---

## Support

For issues or questions:
- Check logs first
- Review [production_deployment_plan.md](file:///home/zius/.gemini/antigravity/brain/0e1efd19-56ee-46e1-a12d-3b277e8cbc51/production_deployment_plan.md)
- Check GitHub issues
