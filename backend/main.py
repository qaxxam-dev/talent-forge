from pathlib import Path
from granian import Granian
from granian.constants import Interfaces

from core.config import config

import os

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    port = int(os.environ.get("BACKEND_PORT", 8001))
    server = Granian(
        "core.server:app",
        address="127.0.0.1",
        port=port,
        interface=Interfaces.ASGI,
        reload=config.ENVIRONMENT != "production",
        reload_paths=[base_dir / "src", base_dir / "core"] if config.ENVIRONMENT != "production" else None,
        workers=1,
    )
    server.serve()
