"""Regression test for SQLAlchemy model registration.

String-based ``relationship()`` targets are resolved from the class registry at
mapper configuration time. Entrypoints that import only a subset of the models
fail on their first query, so verify the worker entrypoint in a clean process.
"""

import subprocess
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]


def test_worker_entrypoint_configures_all_mappers():
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import app.jobs.worker\n"
                "from sqlalchemy.orm import configure_mappers\n"
                "configure_mappers()\n"
            ),
        ],
        cwd=API_ROOT,
        check=False,
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stderr
