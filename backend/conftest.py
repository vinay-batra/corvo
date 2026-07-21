# Makes `import main` work in tests/ regardless of how pytest is invoked.
#
# CI runs the bare `pytest -q tests` console script, which does NOT put the
# current working directory on sys.path (only `python -m pytest` does). With
# pytest's default prepend import mode the inserted path is the test file's
# own directory (backend/tests), not backend/ - so `import main` raised
# ModuleNotFoundError in CI while passing locally under `python -m pytest`.
# That discrepancy kept the backend job red from the day these tests landed.
#
# Putting this file at backend/ pins the package root explicitly, so both
# invocation styles resolve `main` identically.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
