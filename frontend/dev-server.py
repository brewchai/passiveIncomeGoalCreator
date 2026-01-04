#!/usr/bin/env python3
"""
Local development server with SPA routing support.
Mimics Vercel's rewrite rules for local development.
"""

import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Rewrite rules matching vercel.json
REWRITES = {
    '/about': '/about.html',
    '/privacy': '/privacy.html',
    '/terms': '/terms.html',
    '/contact': '/contact.html',
    '/blog': '/blog.html',
}

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        path = self.path.split('?')[0]
        
        # Check if this is a static file request (has file extension)
        has_extension = '.' in path.split('/')[-1]
        
        if path in REWRITES:
            self.path = REWRITES[path]
        elif path.startswith('/blog/') and path != '/blog/' and not has_extension:
            # Only rewrite blog post slugs (no file extension)
            slug = path.replace('/blog/', '').rstrip('/')
            self.path = f'/blog/posts/{slug}/index.html'
        elif path.startswith('/_vercel/'):
            self.send_response(204)
            self.end_headers()
            return
        
        return super().do_GET()
    
    def log_message(self, format, *args):
        status = args[1] if len(args) > 1 else ''
        if '200' in str(status) or '304' in str(status):
            color = '\033[92m'
        elif '404' in str(status):
            color = '\033[91m'
        else:
            color = '\033[93m'
        reset = '\033[0m'
        print(f"{color}[{args[1]}]{reset} {args[0]}")

def run():
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"\n🔥 But First Fire - Local Dev Server")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"  Frontend: http://localhost:{PORT}")
        print(f"  Backend:  http://localhost:5001 (start separately)")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"\nPress Ctrl+C to stop\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")
            sys.exit(0)

if __name__ == "__main__":
    run()
