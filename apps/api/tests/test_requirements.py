import tomllib
from app.config import API_DIR


def test_pyproject_dependencies_match_requirements_txt():
    """Vercel installs from pyproject.toml and the Dockerfile from requirements.txt; both must list the same pins."""
    declared = tomllib.loads((API_DIR / "pyproject.toml").read_text())["project"]["dependencies"]
    pinned = [line.strip() for line in (API_DIR / "requirements.txt").read_text().splitlines() if line.strip()]
    assert sorted(declared) == sorted(pinned)
