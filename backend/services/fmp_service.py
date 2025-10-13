import requests
from datetime import datetime
from typing import Dict, List

class FMPService:
    """Service to interact with Financial Modeling Prep API for stock data"""
    
    BASE_URL = "https://financialmodelingprep.com/stable"
    
    def __init__(self, api_key: str):
        """
        Initialize FMP service
        
        Args:
            api_key: Financial Modeling Prep API key
        """
        self.api_key = api_key
        self.session = requests.Session()
    
    def get_dividend_yield(self, symbol: str) -> Dict:
        """
        Get dividend yield for a stock symbol
        
        Args:
            symbol: Stock ticker symbol (e.g., 'AAPL')
            
        Returns:
            Dict with symbol, dividendYield, and metadata
        """
        try:
            # Use FMP stable API endpoint for dividends
            dividends_url = f"{self.BASE_URL}/dividends"
            params = {
                'symbol': symbol,
                'apikey': self.api_key
            }
            
            print(f"\n=== FMP API Request (Dividends) ===")
            print(f"URL: {dividends_url}")
            print(f"Symbol: {symbol}")
            print(f"API Key (first 10 chars): {self.api_key[:10]}...")
            
            response = self.session.get(dividends_url, params=params, timeout=10)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
            if response.status_code == 429:
                return {
                    'error': 'Rate limit exceeded',
                    'message': 'Too many requests. Please try again later.'
                }
            
            if response.status_code == 403:
                return {
                    'error': 'Invalid API key',
                    'message': 'Please check your FMP API key'
                }
            
            if response.status_code != 200:
                return {
                    'error': 'API error',
                    'message': f'Could not fetch data for {symbol}. Status: {response.status_code}'
                }
            
            data = response.json()
            
            # Check if we got valid dividend data
            if not data or not isinstance(data, list) or len(data) == 0:
                print(f"No dividend data found for {symbol}, returning 0")
                return {
                    'symbol': symbol.upper(),
                    'dividendYield': 0.0,
                    'lastUpdated': datetime.utcnow().isoformat() + 'Z',
                    'source': 'fmp',
                    'message': 'No dividend data available'
                }
            
            # We need the current stock price to calculate yield
            quote_url = f"{self.BASE_URL}/quote"
            quote_params = {
                'symbol': symbol,
                'apikey': self.api_key
            }
            
            quote_response = self.session.get(quote_url, params=quote_params, timeout=10)
            
            print(f"\n=== FMP API Request (Quote) ===")
            print(f"Quote Status Code: {quote_response.status_code}")
            
            if quote_response.status_code == 200:
                quote_data = quote_response.json()
                if quote_data and len(quote_data) > 0:
                    current_price = quote_data[0].get('price', 0)
                    
                    # Calculate annual dividend yield
                    # Get all dividends from the past year and sum them (last 4 quarters)
                    annual_total = sum(d.get('dividend', 0) for d in data[:4])
                    
                    if current_price > 0 and annual_total > 0:
                        dividend_yield = (annual_total / current_price) * 100
                    else:
                        dividend_yield = 0.0
                    
                    print(f"\n=== FMP Data for {symbol} ===")
                    print(f"Annual Dividend: ${annual_total}")
                    print(f"Current Price: ${current_price}")
                    print(f"Dividend Yield: {dividend_yield}%")
                    
                    return {
                        'symbol': symbol.upper(),
                        'dividendYield': round(float(dividend_yield), 2),
                        'lastUpdated': datetime.utcnow().isoformat() + 'Z',
                        'source': 'fmp',
                        'price': current_price,
                        'annualDividend': round(annual_total, 2)
                    }
            
            # Fallback if we couldn't get price
            return {
                'symbol': symbol.upper(),
                'dividendYield': 0.0,
                'lastUpdated': datetime.utcnow().isoformat() + 'Z',
                'source': 'fmp',
                'message': 'Could not calculate yield without price data'
            }
            
        except requests.exceptions.Timeout:
            return {
                'error': 'Request timeout',
                'message': 'FMP API request timed out'
            }
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return {
                'error': 'API request failed',
                'message': str(e)
            }
        except Exception as e:
            print(f"Unexpected error for {symbol}: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': 'Unexpected error',
                'message': str(e)
            }

    def get_batch_dividend_yields(self, symbols: List[str]) -> Dict:
        """
        Get dividend yields for multiple symbols
        
        Args:
            symbols: List of stock ticker symbols
            
        Returns:
            Dict with results for each symbol
        """
        results = {}
        
        for symbol in symbols:
            symbol = symbol.strip().upper()
            if symbol:
                results[symbol] = self.get_dividend_yield(symbol)
        
        return {
            'results': results,
            'count': len(results),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    def search_symbol(self, query: str) -> List[Dict]:
        """
        Search for stock symbols by company name
        
        Args:
            query: Company name or partial ticker
            
        Returns:
            List of matching symbols with descriptions
        """
        try:
            search_url = f"{self.BASE_URL}/search"
            params = {
                'query': query,
                'apikey': self.api_key,
                'limit': 10
            }
            
            response = self.session.get(search_url, params=params, timeout=10)
            
            if response.status_code != 200:
                return []
            
            results = response.json()
            
            # Format results
            formatted_results = []
            for item in results:
                formatted_results.append({
                    'symbol': item.get('symbol'),
                    'name': item.get('name'),
                    'exchange': item.get('exchangeShortName'),
                    'type': item.get('type')
                })
            
            return formatted_results
            
        except Exception as e:
            print(f"Search error: {e}")
            return []
