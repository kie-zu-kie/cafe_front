import hashlib
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template

FRONTEND_DIR = Path(__file__).resolve().parent
load_dotenv(FRONTEND_DIR / ".env")

configured_api_base_url = os.getenv(
    "API_BASE_URL", "https://cafe-back-rfhn.onrender.com/api"
).strip().rstrip("/")
if not configured_api_base_url:
    raise RuntimeError("API_BASE_URL is required. Set it in the environment.")
API_BASE_URL = (
    configured_api_base_url
    if configured_api_base_url.endswith("/api")
    else f"{configured_api_base_url}/api"
)

app = Flask(
    __name__,
    template_folder=str(FRONTEND_DIR / "templates"),
    static_folder=str(FRONTEND_DIR / "static"),
)
DEV_RELOAD_TOKEN = secrets.token_hex(16)


def dev_reload_version():
    digest = hashlib.sha256(DEV_RELOAD_TOKEN.encode())
    watched_paths = [Path(__file__)]
    watched_paths.extend(
        path
        for path in FRONTEND_DIR.rglob("*")
        if path.is_file() and path.suffix in (".html", ".js", ".css")
    )
    for path in sorted(set(watched_paths)):
        digest.update(path.relative_to(FRONTEND_DIR).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


@app.get("/")
def index():
    return render_template("index.html", api_base_url=API_BASE_URL)


@app.get("/__dev/reload")
def dev_reload():
    if not app.debug:
        return jsonify(error="Development reload is disabled"), 404
    response = jsonify(version=dev_reload_version())
    response.headers["Cache-Control"] = "no-store"
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
