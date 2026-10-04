#!/usr/bin/env python3
"""Local IDX Broker Flow Analyzer. Run: python app.py [--port 8765] [--no-browser]."""
import argparse
import csv
import datetime as dt
import http.server
import json
import logging
import socket
from pathlib import Path
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

DEFAULT_PORT = 8765
BASE = Path(__file__).resolve().parent
MAX_BODY = 16 * 1024 * 1024
ALLOWED_HOSTS = {"query1.finance.yahoo.com", "query2.finance.yahoo.com", "api.goapi.io"}
STATIC_FILES = {"/": "index.html", "/index.html": "index.html",
                "/analyzer-ui.js": "analyzer-ui.js", "/analyzer-ui.css": "analyzer-ui.css"}


def validate_proxy_url(target):
    """Apply the same destination policy to initial URLs and every redirect."""
    parsed = urllib.parse.urlsplit(target)
    if (parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS
            or parsed.username or parsed.password or parsed.port not in (None, 443)):
        raise ValueError("Proxy hanya mendukung HTTPS Yahoo Finance dan GoAPI.")
    return target


class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_proxy_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def sample_files():
    """Only explicit fixture directories are exposed, never arbitrary local paths."""
    files = {}
    for folder in ("RAJA", "Bbri"):
        for path in sorted((BASE / folder).glob("*.csv")):
            if path.is_symlink() or not path.resolve().is_relative_to(BASE):
                continue
            files[path.relative_to(BASE).as_posix()] = path
    return files


def sample_metadata(name, path):
    with path.open(encoding="utf-8-sig") as stream:
        row = next(csv.reader(stream, delimiter="\t"), [])
    def field(key):
        return row[row.index(key) + 1] if key in row and row.index(key) + 1 < len(row) else None
    start, end = field("Start"), field("End")
    return {"name": name, "ticker": row[1] if len(row) > 1 else None,
            "start": start, "end": end, "single_day": bool(start and start == end)}


def run_analysis(payload):
    from analyzer import analyze_payload
    if not isinstance(payload, dict):
        raise ValueError("Isi permintaan harus berupa objek JSON.")
    tape_text = payload.get("running_trade")
    if tape_text is not None and not isinstance(tape_text, str):
        raise ValueError("running_trade harus berupa teks CSV/TSV.")
    result = analyze_payload(payload)
    result["tape"] = (run_tape(payload)
                      if tape_text and tape_text.strip() else None)
    if result["tape"]:
        context = result["tape"]["input"]
        if context.get("ticker") and context["ticker"] != result["ticker"]:
            raise ValueError("Ticker running trade berbeda dari broker summary yang dipilih.")
        if context.get("date") and not result["period"]["start"] <= context["date"] <= result["period"]["end"]:
            raise ValueError("Tanggal running trade berada di luar periode broker summary.")
        if not context.get("ticker") or not context.get("date"):
            result["tape"]["warnings"].append(
                "Tape lacks an explicit ticker or date; verify its stock/session before comparing it with the broker summary.")
    return result


def run_tape(payload):
    """A running tape can be screened without a broker-summary upload."""
    from tape_analyzer import analyze_tape
    if not isinstance(payload, dict):
        raise ValueError("Isi permintaan harus berupa objek JSON.")
    tape_text = payload.get("running_trade")
    if not isinstance(tape_text, str) or not tape_text.strip():
        raise ValueError("Tempel running_trade berupa CSV/TSV untuk memeriksa pasangan broker.")
    session_date = payload.get("session_date")
    if session_date is not None:
        if not isinstance(session_date, str):
            raise ValueError("session_date harus berupa tanggal YYYY-MM-DD.")
        try:
            session_date = dt.date.fromisoformat(session_date).isoformat()
        except ValueError as exc:
            raise ValueError("session_date harus berupa tanggal YYYY-MM-DD.") from exc
    result = analyze_tape(tape_text, number_format=payload.get("number_format", "auto"),
                          quantity_unit=payload.get("quantity_unit"))
    if session_date:
        if result["input"].get("date") and result["input"]["date"] != session_date:
            raise ValueError("Tanggal sesi berbeda dari tanggal di dalam tape.")
        if not result["input"].get("date"):
            result["input"]["date"] = session_date
            result["input"]["date_source"] = "user_supplied_session_date"
            result["warnings"].append("Session date was supplied separately; the tape rows contain no date.")
    return result


class LocalServer(http.server.ThreadingHTTPServer):
    # On Windows SO_REUSEADDR can let two processes bind the same port and serve
    # different application versions. Refuse a duplicate local server instead.
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = "IDXAnalyzer/2"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE), **kwargs)

    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def local_request(self):
        expected_port = self.server.server_address[1]
        try:
            host = urllib.parse.urlsplit("http://" + self.headers.get("Host", ""))
            if host.hostname not in {"localhost", "127.0.0.1"} or (host.port or 80) != expected_port:
                return False
            origin = self.headers.get("Origin")
            if origin:
                source = urllib.parse.urlsplit(origin)
                if (source.scheme != "http" or source.hostname != host.hostname
                        or (source.port or 80) != expected_port):
                    return False
            return True
        except ValueError:
            return False

    def send_json(self, status, body):
        data = json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.local_request():
            return self.send_json(403, {"error": "Gunakan alamat localhost aplikasi ini."})
        route = urllib.parse.urlsplit(self.path)
        if route.path == "/api/health":
            return self.send_json(200, {"status": "ok", "engine": "python", "version": 2})
        if route.path == "/api/samples":
            return self.send_json(200, {"files": [sample_metadata(k, v) for k, v in sample_files().items()]})
        if route.path == "/api/sample":
            name = urllib.parse.parse_qs(route.query).get("name", [""])[0]
            path = sample_files().get(name)
            if path is None:
                return self.send_json(404, {"error": "Berkas contoh tidak ditemukan."})
            return self.send_json(200, {"name": name, "text": path.read_text(encoding="utf-8-sig")})
        if route.path == "/api/tape-sample":
            name = "SDMU/Running trade 24 09 2026.txt"
            path = BASE / name
            if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(BASE):
                return self.send_json(404, {"error": "File running trade SDMU tidak ditemukan."})
            return self.send_json(200, {"name": name, "ticker": "SDMU", "session_date": "2026-09-24",
                                       "date_source": "filename", "text": path.read_text(encoding="utf-8-sig")})
        if route.path == "/proxy":
            return self.handle_proxy(route.query)
        if route.path not in STATIC_FILES:
            return self.send_json(404, {"error": "Halaman tidak ditemukan."})
        self.path = "/" + STATIC_FILES[route.path]
        return super().do_GET()

    def do_HEAD(self):
        if not self.local_request():
            return self.send_error(403)
        route = urllib.parse.urlsplit(self.path)
        if route.path not in STATIC_FILES:
            return self.send_error(404)
        self.path = "/" + STATIC_FILES[route.path]
        return super().do_HEAD()

    def do_POST(self):
        if not self.local_request():
            return self.send_json(403, {"error": "Permintaan harus berasal dari aplikasi lokal ini."})
        endpoint = urllib.parse.urlsplit(self.path).path
        if endpoint not in {"/api/analyze", "/api/tape"}:
            return self.send_json(404, {"error": "Endpoint tidak ditemukan."})
        if self.headers.get_content_type() != "application/json":
            return self.send_json(415, {"error": "Gunakan Content-Type: application/json."})
        if self.headers.get("Transfer-Encoding"):
            return self.send_json(400, {"error": "Gunakan Content-Length untuk permintaan JSON."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= MAX_BODY:
                return self.send_json(413, {"error": "Ukuran permintaan harus 1 byte sampai 16 MiB."})
            raw = self.rfile.read(size)
            if len(raw) != size:
                raise ValueError("Permintaan JSON terpotong.")
            def reject_constant(value):
                raise ValueError("Angka JSON harus finite; NaN/Infinity tidak diterima.")
            payload = json.loads(raw.decode("utf-8-sig"), parse_constant=reject_constant)
            result = run_tape(payload) if endpoint == "/api/tape" else run_analysis(payload)
            return self.send_json(200, result)
        except (ValueError, UnicodeError) as exc:
            return self.send_json(400, {"error": str(exc)})
        except (TimeoutError, ConnectionError):
            self.close_connection = True
        except Exception:
            logging.exception("Analysis failed")
            return self.send_json(500, {"error": "Analisis gagal. Periksa log server lokal."})

    def handle_proxy(self, query):
        target = urllib.parse.parse_qs(query).get("url", [""])[0]
        try:
            validate_proxy_url(target)
            req = urllib.request.Request(target, headers={
                "User-Agent": "Mozilla/5.0", "Accept": "application/json"})
            opener = urllib.request.build_opener(RestrictedRedirect())
            with opener.open(req, timeout=25) as response:
                data = response.read(MAX_BODY + 1)
            if len(data) > MAX_BODY:
                raise ValueError("Respons sumber data terlalu besar.")
            return self.send_json(200, json.loads(data))
        except ValueError as exc:
            return self.send_json(400, {"error": str(exc)})
        except urllib.error.HTTPError as exc:
            return self.send_json(exc.code, {"error": "Sumber data mengembalikan HTTP %d." % exc.code})
        except (urllib.error.URLError, TimeoutError, OSError):
            return self.send_json(502, {"error": "Sumber data tidak dapat dihubungi. Coba lagi nanti."})

    def log_message(self, fmt, *args):
        # Do not log query strings: legacy GoAPI requests carry an API key there.
        logging.info("%s %s", self.command, urllib.parse.urlsplit(self.path).path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port harus antara 1 dan 65535")
    logging.basicConfig(level=logging.INFO, format="  %(message)s")
    try:
        server = LocalServer(("127.0.0.1", args.port), Handler)
    except OSError as exc:
        parser.exit(1, "Tidak dapat membuka port %d: %s\n" % (args.port, exc))
    url = "http://localhost:%d" % args.port
    print("IDX Broker Flow Accumulation Analyzer\nBuka: %s\nHentikan: Ctrl+C" % url)
    if not args.no_browser:
        timer = threading.Timer(0.8, lambda: webbrowser.open(url))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
