"""Reproducible local setup; does not alter any existing database cluster."""

from pathlib import Path
import os, secrets, shutil, subprocess, sys

root = Path(__file__).resolve().parents[1]
os.chdir(root)


def run(args, cwd=root):
    subprocess.run(args, cwd=cwd, check=True)


if not Path(".env").exists():
    Path(".env").write_text(
        Path(".env.example")
        .read_text()
        .replace("generate-a-random-64-character-secret", secrets.token_hex(32))
        .replace("generate-another-random-secret", secrets.token_hex(32))
    )
if not Path(".venv").exists():
    run([sys.executable, "-m", "venv", ".venv"])
python = root / ".venv/bin/python"
run([str(python), "-m", "pip", "install", "-r", "apps/api/requirements-dev.txt"])
run(["pnpm", "install", "--frozen-lockfile"])
if not shutil.which("pg_ctl"):
    raise SystemExit(
        "Install PostgreSQL 17, or start infra/compose.yml and set DATABASE_URL in .env, then rerun setup."
    )
local = root / ".local"
local.mkdir(exist_ok=True)
if not (local / "postgres/PG_VERSION").exists():
    run(
        [
            "initdb",
            "-D",
            str(local / "postgres"),
            "-A",
            "trust",
            "--no-locale",
            "-E",
            "UTF8",
        ]
    )
ready = subprocess.run(
    ["pg_isready", "-h", "127.0.0.1", "-p", "55432"], capture_output=True
)
if ready.returncode:
    run(
        [
            "pg_ctl",
            "-D",
            str(local / "postgres"),
            "-l",
            str(local / "postgres.log"),
            "-o",
            "-p 55432 -h 127.0.0.1",
            "start",
        ]
    )
check = subprocess.run(
    [
        "psql",
        "-h",
        "127.0.0.1",
        "-p",
        "55432",
        "-d",
        "postgres",
        "-Atc",
        "SELECT 1 FROM pg_roles WHERE rolname='lilac_app'",
    ],
    capture_output=True,
    text=True,
    check=True,
)
if check.stdout.strip() != "1":
    run(
        [
            "psql",
            "-h",
            "127.0.0.1",
            "-p",
            "55432",
            "-d",
            "postgres",
            "-c",
            "CREATE ROLE lilac_app LOGIN PASSWORD 'lilac_local_only' NOSUPERUSER NOCREATEDB NOCREATEROLE",
        ]
    )
for name in ["lilac", "lilac_test"]:
    result = subprocess.run(
        [
            "psql",
            "-h",
            "127.0.0.1",
            "-p",
            "55432",
            "-d",
            "postgres",
            "-Atc",
            f"SELECT 1 FROM pg_database WHERE datname='{name}'",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    if result.stdout.strip() != "1":
        run(
            [
                "psql",
                "-h",
                "127.0.0.1",
                "-p",
                "55432",
                "-d",
                "postgres",
                "-c",
                f"CREATE DATABASE {name} OWNER lilac_app",
            ]
        )
run([str(root / ".venv/bin/alembic"), "upgrade", "head"], root / "apps/api")
run([str(python), "-m", "app.seed"], root / "apps/api")
run([sys.executable, "scripts/download-assets.py"])
print(
    "Nook is ready. Run pnpm dev, then open http://127.0.0.1:3000. Native: pnpm dev:mobile."
)
