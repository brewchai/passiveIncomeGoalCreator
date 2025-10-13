# Passive Income Goal Tracker - Backend API

Flask backend service that integrates with Financial Modeling Prep (FMP) API to fetch real-time dividend yield data for stocks and ETFs.

## 🚀 Quick Start

### 1. Get FMP API Key

1. Sign up for a free account at [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs)
2. Copy your API key from the dashboard
3. Free tier includes: 250 API calls/day

### 2. Install Dependencies

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your FMP API key
# FMP_API_KEY=your_actual_api_key_here
```

### 4. Run the Server

```bash
python app.py
```

Server will start at `http://localhost:5001`

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Passive Income Goal Tracker API"
}
```

### Get Dividend Yield (Single)
```
GET /api/dividend-yield?symbol=AAPL
```

**Response:**
```json
{
  "symbol": "AAPL",
  "dividendYield": 0.52,
  "lastUpdated": "2025-10-12T12:04:57Z",
  "source": "fmp",
  "price": 178.23,
  "name": "Apple Inc."
}
```

**Error Response:**
```json
{
  "error": "Invalid ticker symbol",
  "message": "Could not find data for symbol: XYZ"
}
```

### Get Dividend Yields (Batch)
```
POST /api/batch-dividend-yields
Content-Type: application/json

{
  "symbols": ["AAPL", "MSFT", "JNJ"]
}
```

**Response:**
```json
{
  "results": {
    "AAPL": {
      "symbol": "AAPL",
      "dividendYield": 0.52,
      "lastUpdated": "2025-10-12T12:04:57Z",
      "source": "fmp"
    },
    "MSFT": {
      "symbol": "MSFT",
      "dividendYield": 0.78,
      "lastUpdated": "2025-10-12T12:04:57Z",
      "source": "fmp"
    }
  },
  "count": 2,
  "timestamp": "2025-10-12T12:04:57Z"
}
```

## 🧪 Testing the API

### Using curl

```bash
# Health check
curl http://localhost:5001/api/health

# Get dividend yield
curl "http://localhost:5001/api/dividend-yield?symbol=AAPL"

# Batch request
curl -X POST http://localhost:5001/api/batch-dividend-yields \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "MSFT", "JNJ"]}'
```

### Using Python

```python
import requests

# Single ticker
response = requests.get('http://localhost:5001/api/dividend-yield?symbol=AAPL')
print(response.json())

# Multiple tickers
response = requests.post(
    'http://localhost:5001/api/batch-dividend-yields',
    json={'symbols': ['AAPL', 'MSFT', 'JNJ']}
)
print(response.json())
```

## 📁 Project Structure

```
backend/
├── app.py                      # Main Flask application
├── services/
│   ├── __init__.py
│   └── fmp_service.py          # FMP API integration
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🔧 Development

### Running in Debug Mode

The server runs in debug mode by default during development:

```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

### Error Handling

The API handles various error scenarios:
- Invalid ticker symbols (404)
- Missing parameters (400)
- Rate limit exceeded (429)
- API timeouts (500)
- Network errors (500)

## 🌐 CORS Configuration

CORS is enabled for all origins to allow frontend requests. In production, you should restrict this:

```python
CORS(app, origins=['https://yourdomain.com'])
```

## 📊 Financial Modeling Prep API Details

### Rate Limits
- Free tier: 250 calls/day
- Premium plans available for higher limits

### Data Provided
- Dividend yield (annual percentage)
- Real-time stock quotes
- Company profiles
- Symbol search
- Historical data

### API Documentation
https://site.financialmodelingprep.com/developer/docs

### Advantages over Finnhub
- Direct dividend yield in quote endpoint
- More reliable data format
- Better free tier limits
- Cleaner API responses

## 🚀 Deployment

### Option 1: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Heroku
```bash
# Create Procfile
echo "web: python app.py" > Procfile

# Deploy
heroku create your-app-name
git push heroku main
```

### Option 3: Render
1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically

## 🔐 Security Notes

- Never commit `.env` file to git
- Use environment variables for API keys
- Implement rate limiting for production
- Add authentication for public deployments

## 📝 License

Open source - free to use and modify

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
