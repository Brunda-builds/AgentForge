"""
audit_env.py

Checks installed versions of google-generativeai and urllib3, reports certifi path,
and lists available GenAI models using the configured API key. Ensures the client
uses the v1 (stable) endpoint by default.

Usage:
  - Set environment variable `GENAI_API_KEY` or pass `--api-key`.
  - Run: `python audit_env.py --api-key YOUR_KEY`
"""
import argparse
import importlib
import json
import os
import subprocess
import sys


def run_pip_show(pkg_name: str) -> str:
    try:
        proc = subprocess.run([sys.executable, "-m", "pip", "show", pkg_name], capture_output=True, text=True)
        out = proc.stdout
        for line in out.splitlines():
            if line.startswith("Version:"):
                return line.split("Version:")[-1].strip()
        return "(installed, version unknown)" if out else "(not installed)"
    except Exception as e:
        return f"error: {e}"


def import_version(module_name: str) -> str:
    try:
        mod = importlib.import_module(module_name)
    except Exception as e:
        return f"not importable: {e}"
    for attr in ("__version__", "version"):
        v = getattr(mod, attr, None)
        if isinstance(v, str):
            return v
    return "(imported, version attr not found)"


def certifi_path() -> str:
    try:
        import certifi

        return certifi.where()
    except Exception as e:
        return f"certifi not available: {e}"


def list_models_via_genai(api_key: str):
    try:
        # Import the official library. The package name installed by pip is
        # `google-generativeai`, import path is `google.generativeai`.
        import google.generativeai as genai
    except Exception as e:
        print("ERROR: Unable to import google.generativeai:", e)
        print("Install/upgrade with: python -m pip install --upgrade google-generativeai")
        return

    # Force using the v1 stable endpoint to avoid v1beta 404 errors in some regions
    try:
        # Configure API key and base path. If the library changes signatures,
        # this will raise; handle gracefully.
        base = "https://generativelanguage.googleapis.com/v1"
        try:
            genai.configure(api_key=api_key, api_base=base)
        except TypeError:
            # Some versions accept different named args
            genai.configure(api_key=api_key)
            # Try setting api_base attribute if present
            if hasattr(genai, "api_base"):
                setattr(genai, "api_base", base)

        print("Configured genai with v1 stable endpoint:", base)

        # The list_models return type may be a dict or a sequence depending on version.
        models = genai.list_models()
        print("Raw response from genai.list_models():")
        try:
            print(json.dumps(models, indent=2, default=str))
        except Exception:
            print(models)

        print("\nAvailable models (best-effort parsing):")
        if isinstance(models, dict):
            # Common pattern: {'models': [ ... ]}
            items = models.get("models") or models.get("model") or []
        else:
            items = models

        if not items:
            print("(no models found in response)")
            return

        for m in items:
            # model could be a dict or object
            name = None
            if isinstance(m, dict):
                name = m.get("name") or m.get("id") or m.get("model")
            else:
                name = getattr(m, "name", None) or getattr(m, "id", None)
            print("-", name or repr(m))

    except Exception as e:
        print("Error calling genai.list_models():", e)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--api-key", help="Generative AI API key (or set GENAI_API_KEY env var)")
    args = p.parse_args()

    api_key = args.api_key or os.environ.get("GENAI_API_KEY") or os.environ.get("API_KEY")
    print("Python executable:", sys.executable)
    print("Python version:", sys.version.replace('\n', ' '))

    # Report pip/package info
    for pkg in ("google-generativeai", "urllib3", "certifi"):
        v = run_pip_show(pkg)
        print(f"pip show {pkg}: {v}")

    # Report import-time versions
    print("\nImported version probes:")
    for mod in ("google.generativeai", "urllib3"):
        print(f"{mod}: {import_version(mod)}")

    print("certifi path:", certifi_path())

    if not api_key:
        print("\nNo API key provided. Set GENAI_API_KEY or pass --api-key to list models.")
        return

    print("\nListing available models for provided API key...")
    list_models_via_genai(api_key)


if __name__ == "__main__":
    main()
