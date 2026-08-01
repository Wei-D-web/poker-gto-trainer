"""Minimal SPA server — strips /poker-gto-trainer/app prefix, falls back to index.html."""
import http.server
import os

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
BASE_PREFIX = "/poker-gto-trainer/app"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Strip base path prefix if present (vite build uses /poker-gto-trainer/app/)
        if self.path.startswith(BASE_PREFIX):
            self.path = self.path[len(BASE_PREFIX):] or "/"

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            self.path = "/index.html"
        super().do_GET()

if __name__ == "__main__":
    print(f"SPA server listening on :{PORT}")
    http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler).serve_forever()
