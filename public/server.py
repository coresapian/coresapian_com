#!/usr/bin/env python3
"""
Simple HTTP server for testing the CoreSapian modular application
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Set the port
PORT = 8000

# Change to the public directory
public_dir = Path(__file__).parent
os.chdir(public_dir)

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Add proper MIME types for ES modules
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.mjs'):
            self.send_header('Content-Type', 'application/javascript')
            
        super().end_headers()

    def log_message(self, format, *args):
        # Custom logging format
        print(f"[{self.address_string()}] {format % args}")

if __name__ == "__main__":
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 CoreSapian Test Server")
            print(f"📁 Serving directory: {public_dir}")
            print(f"🌐 Server running at: http://localhost:{PORT}")
            print(f"🎵 Audio Visualizer: http://localhost:{PORT}/index.html")
            print(f"⚡ ES6 Modules enabled with CORS support")
            print(f"🛑 Press Ctrl+C to stop the server")
            print("-" * 50)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port.")
            sys.exit(1)
        else:
            print(f"❌ Error starting server: {e}")
            sys.exit(1)
