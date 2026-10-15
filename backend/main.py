from pathlib import Path
from granian import Granian
from granian.constants import Interfaces

from core.config import config

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    server = Granian(
        "core.server:app",
        address="127.0.0.1",
        port=8000,
        interface=Interfaces.ASGI,
        reload=True,
        reload_paths=[base_dir / "src", base_dir / "core"],
        workers=1,
    )
    server.serve()
