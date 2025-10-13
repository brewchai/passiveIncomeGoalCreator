import requests
from datetime import datetime
from typing import Dict, List, Optional

class FinnhubService:
    """Service to interact with Finnhub API for stock data"""
    
    BASE_URL = "https://finnhub.io/api/v1"
    
    def __init__(self, api_key: str):
        """
        Initialize Finnhub service
        
        Args:
            api_key: Finnhub API key
        """
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-Finnhub-Token': self.api_key
        })
    
    def get_dividend_yield(self, symbol: str) -> Dict:
        """
        Get dividend yield for a stock symbol
        
        Args:
            symbol: Stock ticker symbol (e.g., 'AAPL')
            
        Returns:
            Dict with symbol, dividendYield, and metadata
        """
        try:
            # First try to get quote data which includes dividend info
            quote_url = f"{self.BASE_URL}/quote"
            quote_params = {'symbol': symbol}
            
            quote_response = self.session.get(quote_url, params=quote_params, timeout=10)
            
            if quote_response.status_code == 429:
                return {
                    'error': 'Rate limit exceeded',
                    'message': 'Too many requests. Please try again later.'
                }
            
            if quote_response.status_code != 200:
                return {
                    'error': 'Invalid ticker symbol',
                    'message': f'Could not find data for symbol: {symbol}'
                }
            
            quote_data = quote_response.json()
            current_price = quote_data.get('c', 0)  # Current price
            
            # Now fetch company metrics which includes dividend data
            metrics_url = f"{self.BASE_URL}/stock/metric"
            params = {
                'symbol': symbol,
                'metric': 'all'
            }
            
            response = self.session.get(metrics_url, params=params, timeout=10)
            
            if response.status_code != 200:
                return {
                    'error': 'Invalid ticker symbol',
                    'message': f'Could not find data for symbol: {symbol}'
                }
            
            data = response.json()
            
            # Debug: Print what we received
            print(f"\n=== DEBUG: Data for {symbol} ===")
            print(f"Quote data: {quote_data}")
            print(f"Metric keys: {list(data.get('metric', {}).keys())}")
            
            # Check if we got valid data
            if not data or 'metric' not in data:
                return {
                    'error': 'No data available',
                    'message': f'No dividend data found for {symbol}'
                }
            
            metric = data.get('metric', {})
            
            # Try to get dividend yield from various possible fields
            dividend_yield = None
            
            # Check all possible dividend-related fields
            possible_yield_fields = [
                'dividendYieldIndicatedAnnual',
                'dividendYield',
                'dividendYieldTTM',
                'annualDividendYield'
            ]
            
            for field in possible_yield_fields:
                if field in metric and metric[field] is not None:
                    dividend_yield = metric[field]
                    print(f"Found dividend yield in field '{field}': {dividend_yield}")
                    break
            
            # If no direct yield field, try to calculate from dividend per share
            if dividend_yield is None:
                dividend_fields = [
                    'dividendPerShareAnnual',
                    'dividendPerShareTTM',
                    'dividendPerShare'
                ]
                
                dividend_per_share = None
                for field in dividend_fields:
                    if field in metric and metric[field] is not None:
                        dividend_per_share = metric[field]
                        print(f"Found dividend per share in field '{field}': {dividend_per_share}")
                        break
                
                if dividend_per_share and current_price and current_price > 0:
                    dividend_yield = (dividend_per_share / current_price) * 100
                    print(f"Calculated yield: {dividend_yield}% (DPS: {dividend_per_share}, Price: {current_price})")
            
            # If still no dividend yield, it might be a non-dividend paying stock
            if dividend_yield is None or dividend_yield == 0:
                print(f"No dividend data found for {symbol}, returning 0")
                dividend_yield = 0.0
            
            return {
                'symbol': symbol.upper(),
                'dividendYield': round(float(dividend_yield), 2),
                'lastUpdated': datetime.utcnow().isoformat() + 'Z',
                'source': 'finnhub'
            }
            
        except requests.exceptions.Timeout:
            return {
                'error': 'Request timeout',
                'message': 'Finnhub API request timed out'
            }
        except requests.exceptions.RequestException as e:
            return {
                'error': 'API request failed',
                'message': str(e)
            }
        except Exception as e:
            print(f"Unexpected error for {symbol}: {e}")
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
            params = {'q': query}
            
            response = self.session.get(search_url, params=params, timeout=10)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            results = data.get('result', [])
            
            # Format results
            formatted_results = []
            for item in results[:10]:  # Limit to top 10 results
                formatted_results.append({
                    'symbol': item.get('symbol'),
                    'description': item.get('description'),
                    'type': item.get('type')
                })
            
            return formatted_results
            
        except Exception as e:
            print(f"Search error: {e}")
            return []
