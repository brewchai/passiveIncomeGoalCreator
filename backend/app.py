from flask import Flask, jsonify, request
from flask_cors import CORS
from services.fmp_service import FMPService
import os
from dotenv import load_dotenv
import time
import typing as t
from openai import OpenAI
import re
import csv
from datetime import datetime
import httpx

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend requests from production and local dev
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://butfirstfire.com",
            "https://www.butfirstfire.com",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Simple email validator
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Initialize FMP service
fmp_service = FMPService(api_key=os.getenv('FMP_API_KEY'))

# In-memory store for latest screen context (updated by frontend)
LATEST_CONTEXT: dict[str, t.Any] = {
    "updated_at": None,
    "dom": None,
    "app_state": None,
    "url": None,
}

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'FIRE Tracker API'
    }), 200

@app.post('/api/waitlist')
def waitlist():
    try:
        data = request.get_json(force=True, silent=True) or {}
        email = (data.get('email') or '').strip()
        meta = data.get('meta') or {}

        if not email or not EMAIL_RE.match(email):
            return jsonify({'success': False, 'error': 'invalid_email'}), 400

        # Persist to CSV (server-side storage)
        csv_path = os.path.join(os.path.dirname(__file__), 'waitlist.csv')
        is_new_file = not os.path.exists(csv_path)
        with open(csv_path, 'a', newline='') as f:
            writer = csv.writer(f)
            if is_new_file:
                writer.writerow(['timestamp_iso', 'email', 'meta'])
            writer.writerow([datetime.utcnow().isoformat(), email, str(meta)])

        # Optional: forward to webhook automation (e.g., Zapier/Make/Sheets)
        webhook_url = os.getenv('WAITLIST_WEBHOOK_URL')
        if webhook_url:
            try:
                # Send flattened payload for easier Zapier mapping
                payload = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'email': email,
                    'source': meta.get('source', ''),
                    'builderStep': meta.get('builderStep', '')
                }
                with httpx.Client(timeout=5.0) as client:
                    client.post(webhook_url, json=payload)
            except Exception as e:
                # Don't fail the user if webhook forwarding fails
                print('Waitlist webhook error:', e)

        return jsonify({'success': True})
    except Exception as e:
        print('Waitlist error:', e)
        return jsonify({'success': False, 'error': 'server_error'}), 500

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

# --- MCP-style endpoints ---
@app.route('/api/mcp/update-context', methods=['POST'])
def mcp_update_context():
    """Front-end posts the current screen context (DOM + appState + URL).
    Body: { dom: string, appState: object, url: string }
    """
    data = request.get_json(force=True, silent=True) or {}
    LATEST_CONTEXT["dom"] = data.get("dom")
    LATEST_CONTEXT["app_state"] = data.get("appState")
    LATEST_CONTEXT["url"] = data.get("url")
    LATEST_CONTEXT["updated_at"] = int(time.time())
    return jsonify({"ok": True, "updated_at": LATEST_CONTEXT["updated_at"]})

@app.route('/api/mcp/resources', methods=['GET'])
def mcp_resources():
    """List available resources following MCP concepts."""
    resources = [
        {
            "uri": "mcp://screen/dom",
            "name": "Current DOM Snapshot",
            "description": "Outer HTML of the current page the user is viewing",
        },
        {
            "uri": "mcp://screen/app_state",
            "name": "App State Snapshot",
            "description": "Serialized appState object from the client",
        },
        {
            "uri": "mcp://screen/url",
            "name": "Current URL",
            "description": "Window location URL of the page",
        },
    ]
    return jsonify({"resources": resources, "updated_at": LATEST_CONTEXT["updated_at"]})

@app.route('/api/mcp/read', methods=['GET'])
def mcp_read():
    """Read a specific resource content by URI."""
    uri = request.args.get('uri', '')
    if uri == 'mcp://screen/dom':
        return jsonify({"content": LATEST_CONTEXT["dom"], "mime": "text/html"})
    if uri == 'mcp://screen/app_state':
        return jsonify({"content": LATEST_CONTEXT["app_state"], "mime": "application/json"})
    if uri == 'mcp://screen/url':
        return jsonify({"content": LATEST_CONTEXT["url"], "mime": "text/plain"})
    return jsonify({"error": "unknown_uri", "message": f"No resource for {uri}"}), 404

@app.route('/api/chat', methods=['POST'])
def chat():
    """Simple chat endpoint that incorporates latest screen context.
    Body: { message: string }
    """
    print("=== CHAT ENDPOINT CALLED ===")
    
    data = request.get_json(force=True, silent=True) or {}
    message = data.get('message', '').strip()
    print(f"Received message: {message}")
    
    if not message:
        print("ERROR: Empty message")
        return jsonify({"error": "empty_message"}), 400

    # Compose a context-aware prompt
    system_prompt = (
        "You are a financial assistant for a Passive Income Goal Tracker app. "
        "Your ONLY purpose is to help users with finance-related topics including: "
        "passive income strategies, dividend investing, rental property income, expense tracking, "
        "financial independence (FIRE), portfolio allocation, yield calculations, economy, stock market, financial information of publicly traded companies and goal planning.\n\n"
        "STRICT RULES:\n"
        "1. ONLY answer questions related to finance, investing, passive income, budgeting, wealth building and about this website.\n"
        "2. If asked about non-finance topics and anything not related to the website (sports, weather, general knowledge, coding, etc.), "
        "politely decline and redirect: 'I'm specialized in using this tool for financial planning and passive income strategies. "
        "Please ask me about your portfolio, income sources, expenses, or financial goals.'\n"
        "3. Use the provided appState and DOM context to give personalized advice based on their actual data. You do not need to use this data for every single message. Only use it if relating this data with the current user query can render a more helpful response. Otherwise chose to ignore it. Strictly avoid using technical terms outside of finance. For example when asked about the page contents, refrain from using appState, DOM or any other web related terms.\n"
        "4. Be concise, helpful, and reference specific values from their portfolio, income, expenses, or goals when relevant.\n"
        "5. Format responses with Markdown for clarity (use **bold**, lists, code blocks (especially for math formulas always!!)small headers only when appropriate).\n"
        "6. For mathematical formulas, use LaTeX notation with proper delimiters: \\[ \\] for display blocks (centered equations) and $ $ for inline math.\n"
        "   IMPORTANT: Only use math delimiters for actual mathematical expressions (numbers, operators, variables). Never put regular English text inside $ $ or \\[ \\]. For example, use '$2 + 3 = 5$' not '$2 and is already achieved$'.\n"
        "7. Try to be concise unless asked to provide a detailed explanation."

    )
    context_blob = {
        "url": LATEST_CONTEXT.get("url"),
        "appState": LATEST_CONTEXT.get("app_state"),
        "domPreview": (LATEST_CONTEXT.get("dom") or "")[:5000],  # cap size
    }
    print(f"Context blob keys: {list(context_blob.keys())}")
    print(f"App state present: {context_blob['appState'] is not None}")

    # If OpenAI API key is configured, use it; else return a fallback response.
    openai_key = os.getenv('OPENAI_API_KEY')
    print(f"OpenAI key present: {openai_key is not None}")
    
    if openai_key:
        try:
            print("Attempting OpenAI API call...")
            client = OpenAI(api_key=openai_key)
            model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
            print(f"Using model: {model}")

            response = client.chat.completions.create(
                model=model,
                max_tokens=1024,
                temperature=0.3,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": f"Context: {context_blob}\n\nUser question: {message}"
                    }
                ]
            )
            print("OpenAI API call successful")

            reply = response.choices[0].message.content
            print(f"Reply: {reply[:100]}...")
            return jsonify({"reply": reply, "usedModel": model})
        except Exception as e:
            print(f"OpenAI API error: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "reply": f"Error: {str(e)}",
                "usedModel": "error"
            }), 500

    # Fallback (no OpenAI key)
    print("Using fallback response")
    reply = "OpenAI API key not configured. Set OPENAI_API_KEY in .env file."
    return jsonify({"reply": reply, "usedModel": "fallback"})

if __name__ == '__main__':
    # Check if API key is set
    if not os.getenv('FMP_API_KEY'):
        print("WARNING: FMP_API_KEY not set in environment variables!")
        print("Please create a .env file with your FMP API key")
        print("Get your free API key from: https://site.financialmodelingprep.com/developer/docs")

    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5001)
