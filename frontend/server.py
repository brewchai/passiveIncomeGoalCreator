#!/usr/bin/env python3
import http.server
import socketserver
from urllib.parse import urlparse
from pathlib import Path

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Blog listing
        if path == '/blog':
            self.path = '/blog.html'
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

        # Blog post detail: /blog/<slug> or /blog/<slug>/
        if path.startswith('/blog/'):
            parts = [p for p in path.split('/') if p]
            # Expect ['blog', '<slug>']
            if len(parts) == 2:
                slug = parts[1]
                candidate = Path(f'blog/posts/{slug}/index.html')
                if candidate.exists():
                    self.path = f'/{candidate.as_posix()}'
                    return http.server.SimpleHTTPRequestHandler.do_GET(self)
                else:
                    # 404 for unknown blog slugs (good for SEO)
                    self.send_error(404, "Blog post not found")
                    return
            # If deeper paths, fall through to default handling

        # SPA fallback for non-asset unknown paths
        if not path.endswith(('.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg', '.gif')):
            if path != '/':
                self.path = '/index.html'
                return http.server.SimpleHTTPRequestHandler.do_GET(self)

        return http.server.SimpleHTTPRequestHandler.do_GET(self)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    httpd.serve_forever()