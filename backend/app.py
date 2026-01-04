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
    """Context-aware chat endpoint that uses userContext for personalized advice.
    Body: { message: string, history: array, userContext: object }
    """
    print("=== CHAT ENDPOINT CALLED ===")
    
    data = request.get_json(force=True, silent=True) or {}
    message = data.get('message', '').strip()
    history = data.get('history', [])
    user_context = data.get('userContext', {})
    
    print(f"Received message: {message}")
    print(f"Received history length: {len(history)}")
    print(f"UserContext present: {bool(user_context)}")
    
    if not message:
        print("ERROR: Empty message")
        return jsonify({"error": "empty_message"}), 400

    # Format user context into a readable snapshot
    def format_currency(val):
        if val is None or val == 0:
            return "$0"
        return f"${val:,.0f}"
    
    def format_percent(val):
        if val is None:
            return "0%"
        return f"{val}%"

    # Build the financial snapshot string
    monthly_income = user_context.get('totalMonthlyIncome', 0)
    monthly_expenses = user_context.get('monthlyExpenses', 0)
    savings_rate = user_context.get('savingsRate', 0)
    fire_number = user_context.get('fireNumber', 0)
    projected_year = user_context.get('projectedFIYear')
    net_worth = user_context.get('totalNetWorth', 0)
    
    # Build expense breakdown string
    expense_breakdown = user_context.get('expenseBreakdown', [])
    expense_str = ", ".join([f"{e.get('name', 'Unknown')}: {format_currency(e.get('amount', 0))}" for e in expense_breakdown[:8]]) if expense_breakdown else "No expenses tracked"
    
    # Build portfolio string
    portfolio = user_context.get('portfolio', [])
    portfolio_str = ", ".join([f"{p.get('symbol', '?')}: {p.get('percent', 0)}% @ {p.get('yield', 0):.1f}% yield" for p in portfolio[:5]]) if portfolio else "No stocks"
    
    # Build properties string
    properties = user_context.get('properties', [])
    properties_str = ", ".join([f"{p.get('name', 'Property')}: {format_currency(p.get('value', 0))} ({'rented' if p.get('monthlyRent', 0) > 0 else 'primary'})" for p in properties[:3]]) if properties else "No properties"

    # Determine user phase
    years_to_fi = (projected_year - 2026) if projected_year and projected_year > 2026 else None
    if years_to_fi and years_to_fi > 20:
        phase_note = "The user's FI goal is very far away (>20 years). Suggest aggressive optimization strategies."
    elif years_to_fi and years_to_fi <= 5:
        phase_note = "The user is close to FI (<5 years). Focus on risk management and withdrawal strategies."
    else:
        phase_note = "The user is in the accumulation phase, building wealth steadily."

    # Handle new user (empty data) gracefully
    if monthly_income == 0 and net_worth == 0:
        context_section = """
The user appears to be new or hasn't entered their financial data yet.
Encourage them to fill in their income, expenses, and assets so you can provide personalized advice.
For now, give general FIRE guidance and ask clarifying questions about their situation.
"""
    else:
        context_section = f"""
USER'S LIVE FINANCIAL SNAPSHOT:

Income (Monthly):
- Job: {format_currency(user_context.get('monthlyJobIncome', 0))}
- Dividends: {format_currency(user_context.get('monthlyDividendIncome', 0))}
- Rental: {format_currency(user_context.get('monthlyRentalIncome', 0))}
- TOTAL: {format_currency(monthly_income)}

Expenses (Monthly): {format_currency(monthly_expenses)}
- Breakdown: {expense_str}

Savings Rate: {format_percent(savings_rate)}

Net Worth: {format_currency(net_worth)}
- Portfolio Value: {format_currency(user_context.get('portfolioValue', 0))}
- Real Estate Equity: {format_currency(user_context.get('realEstateValue', 0))}
- Retirement Accounts: {format_currency(user_context.get('retirementTotal', 0))}
- Savings/Cash: {format_currency(user_context.get('savingsTotal', 0))}

Portfolio: {portfolio_str}
Blended Dividend Yield: {user_context.get('blendedYield', 0):.2f}%

Properties: {properties_str}

FIRE Metrics:
- FIRE Number (25x expenses): {format_currency(fire_number)}
- Projected FI Year: {projected_year if projected_year else 'Not calculated'}
- Years to FI: {years_to_fi if years_to_fi else 'N/A'}

{phase_note}
"""

    # Build the personalized system prompt
    system_prompt = f"""You are an expert Financial Independence & Retire Early (FIRE) Advisor.
Your goal is to help the user reach financial independence faster by analyzing their specific numbers.

{context_section}

CRITICAL RESPONSE RULES:
1. **BE EXTREMELY BRIEF.** Max 3-4 sentences for simple questions. Max 5-6 bullet points for complex ones.
2. **NO CALCULATION STEPS.** Give the answer directly, NOT the math. Only show formulas if the user explicitly asks "how did you calculate that" or "show me the math."
   - Bad: "First I calculated your monthly savings ($5,000), then multiplied by 12..."
   - Good: "At your current pace, you'll hit FI in **2031** (5 years)."
3. Reference their **specific numbers** when relevant (savings rate, expenses, net worth).
4. Use **bold** for key numbers and takeaways.
5. Skip pleasantries. Get straight to the point.
6. If they're far from FI (>15 years), give ONE actionable tip, not a lecture.
7. Assume 4% safe withdrawal rate unless told otherwise."""

    # If OpenAI API key is configured, use it; else return a fallback response.
    openai_key = os.getenv('OPENAI_API_KEY')
    print(f"OpenAI key present: {openai_key is not None}")
    
    if openai_key:
        try:
            print("Attempting OpenAI API call...")
            client = OpenAI(api_key=openai_key)
            model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
            print(f"Using model: {model}")

            # Construct messages with system prompt, history, and current question
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add valid history messages
            for msg in history:
                if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                    # Sanitize role to be either 'user' or 'assistant'
                    role = 'assistant' if msg['role'] not in ['user', 'assistant'] else msg['role']
                    messages.append({"role": role, "content": str(msg['content'])})

            # Add current user message (no need to repeat context, it's in system prompt)
            messages.append({
                "role": "user",
                "content": message
            })

            response = client.chat.completions.create(
                model=model,
                max_tokens=1024,
                temperature=0.3,
                messages=messages
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
