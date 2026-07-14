#!/bin/bash
cd "$(dirname "$0")"

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

echo ""
echo "=========================================="
echo "  Starky test server starting..."
echo ""
if [ -n "$IP" ]; then
  echo "  On your iPhone (same Wi-Fi), open:"
  echo "  http://$IP:8001"
else
  echo "  Could not detect your Mac's local IP."
  echo "  Check System Settings > Wi-Fi > Details for it instead."
fi
echo ""
echo "  This server tells your browser never to cache files,"
echo "  so every reload always shows your latest changes."
echo "  Press Ctrl+C here (or just close this window) to stop."
echo "=========================================="
echo ""

python3 -c "
import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

httpd = http.server.ThreadingHTTPServer(('0.0.0.0', 8001), NoCacheHandler)
httpd.serve_forever()
"
