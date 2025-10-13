from flask import Flask, jsonify, request
from flask_cors import CORS
from services.fmp_service import FMPService
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize FMP service
fmp_service = FMPService(api_key=os.getenv('FMP_API_KEY'))

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Passive Income Goal Tracker API'
    }), 200

@app.route('/api/dividend-yield', methods=['GET'])
def get_dividend_yield():
    """
    Get dividend yield for a stock ticker
    Query params: symbol (required)
    Example: /api/dividend-yield?symbol=AAPL
    """
    symbol = request.args.get('symbol', '').strip().upper()
    
    if not symbol:
        return jsonify({
            'error': 'Missing required parameter: symbol'
        }), 400
    
    try:
        result = fmp_service.get_dividend_yield(symbol)
        
        if result.get('error'):
            return jsonify(result), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/batch-dividend-yields', methods=['POST'])
def get_batch_dividend_yields():
    """
    Get dividend yields for multiple tickers
    Body: { "symbols": ["AAPL", "MSFT", "JNJ"] }
    """
    data = request.get_json()
    
    if not data or 'symbols' not in data:
        return jsonify({
            'error': 'Missing required field: symbols'
        }), 400
    
    symbols = data['symbols']
    
    if not isinstance(symbols, list) or len(symbols) == 0:
        return jsonify({
            'error': 'symbols must be a non-empty array'
        }), 400
    
    try:
        results = fmp_service.get_batch_dividend_yields(symbols)
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Check if API key is set
    if not os.getenv('FMP_API_KEY'):
        print("WARNING: FMP_API_KEY not set in environment variables!")
        print("Please create a .env file with your FMP API key")
        print("Get your free API key from: https://site.financialmodelingprep.com/developer/docs")
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5001)
