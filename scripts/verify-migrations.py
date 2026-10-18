"""Exercise migration up/down/up on a dedicated disposable database only."""

import os, subprocess
from pathlib import Path
from sqlalchemy import create_engine, text

root = Path(__file__).resolve().parents[1]
url = os.environ.get(
    "MIGRATION_TEST_DATABASE_URL",
    "postgresql+psycopg://lilac_app:lilac_local_only@127.0.0.1:55432/lilac_migration_test",
)
assert url.rsplit("/", 1)[-1].endswith("_test"), "Use an isolated *_test database."
env = {**os.environ, "DATABASE_URL": url}
for revision in ["head", "base", "head"]:
    subprocess.run(
        [
            str(root / ".venv/bin/alembic"),
            "upgrade" if revision == "head" else "downgrade",
            revision,
        ],
        cwd=root / "apps/api",
        env=env,
        check=True,
    )
with create_engine(url).connect() as c:
    total = c.scalar(
        text(
            "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename!='alembic_version'"
        )
    )
    protected = c.scalar(
        text(
            "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname!='alembic_version' AND c.relrowsecurity"
        )
    )
    assert total == protected, (total, protected)
    print(
        f"Migration up/down/up passed; all {total} application tables have RLS enabled."
    )
