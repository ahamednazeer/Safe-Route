#!/usr/bin/env python3
"""Run the Safe Route FastAPI application."""

import sys
from pathlib import Path

# Add src to path so safe_route can be imported
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "safe_route.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src"],
    )
