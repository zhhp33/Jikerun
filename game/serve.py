"""Serve just the game, with a browser link and optional local-network access."""
import argparse
import functools
import http.server
import webbrowser
from pathlib import Path

parser = argparse.ArgumentParser(description="即刻开溜本地试玩")
parser.add_argument("--lan", action="store_true", help="允许同一 Wi-Fi 下的手机访问")
parser.add_argument("--port", type=int, default=5173)
parser.add_argument("--open", action="store_true", help="启动后打开浏览器")
args = parser.parse_args()
host = "0.0.0.0" if args.lan else "127.0.0.1"
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
with http.server.ThreadingHTTPServer((host, args.port), handler) as server:
    print(f"即刻开溜已启动：http://localhost:{args.port}", flush=True)
    print("同一 Wi-Fi 的设备也可访问游戏。" if args.lan else "仅本机可访问。", flush=True)
    print("按 Control + C 停止预览。", flush=True)
    if args.open:
        webbrowser.open(f"http://localhost:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
