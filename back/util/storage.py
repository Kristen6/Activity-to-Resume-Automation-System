import json
import os

DATA_DIR = "data"


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def get_users() -> dict:
    _ensure_dir()
    path = os.path.join(DATA_DIR, "users.json")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


def save_users(users: dict):
    _ensure_dir()
    with open(os.path.join(DATA_DIR, "users.json"), "w") as f:
        json.dump(users, f, indent=2)


def get_achievements(username: str) -> list:
    _ensure_dir()
    path = os.path.join(DATA_DIR, f"achievements_{username}.json")
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


def save_achievements(username: str, achievements: list):
    _ensure_dir()
    with open(os.path.join(DATA_DIR, f"achievements_{username}.json"), "w") as f:
        json.dump(achievements, f, indent=2)
