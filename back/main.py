from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import anthropic

from util import init
from util import auth as auth_util
from util import storage

app = FastAPI()
conf = init.env()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

SECRET_KEY = conf.get("SECRET_KEY", "dev-secret-key-change-in-production")
ANTHROPIC_API_KEY = conf.get("ANTHROPIC_API_KEY", "")


# ── Auth dependency ──

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        return auth_util.decode_token(credentials.credentials, SECRET_KEY)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Request models ──

class AuthRequest(BaseModel):
    username: str
    password: str

class SaveRequest(BaseModel):
    achievements: list

class ParseRequest(BaseModel):
    text: str

class GenRequest(BaseModel):
    achievements: list
    name: str = ""
    email: str = ""
    role: str = ""
    location: str = ""
    prompt: str = ""


# ── Auth endpoints ──

@app.post("/auth/register")
async def register(req: AuthRequest):
    if not req.username or not req.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    users = storage.get_users()
    if req.username in users:
        raise HTTPException(status_code=409, detail="Username already exists")
    users[req.username] = {"hashed_password": auth_util.hash_password(req.password)}
    storage.save_users(users)
    return {"message": "Registered successfully"}


@app.post("/auth/login")
async def login(req: AuthRequest):
    users = storage.get_users()
    user = users.get(req.username)
    if not user or not auth_util.verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = auth_util.create_token(req.username, SECRET_KEY)
    return {"token": token, "token_type": "bearer"}


# ── Achievement endpoints ──

@app.get("/get")
async def get_achievements(username: str = Depends(get_current_user)):
    return storage.get_achievements(username)


@app.post("/save")
async def save_achievements(req: SaveRequest, username: str = Depends(get_current_user)):
    storage.save_achievements(username, req.achievements)
    return {"code": 0}


# ── AI endpoints ──

@app.post("/parse")
async def parse_transcript(req: ParseRequest, username: str = Depends(get_current_user)):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system='You extract achievement info from spoken text and return ONLY a JSON object with keys: cat (one of: work, education, project, leadership, award, volunteer), title (concise 1-line title), org (organization or context, or ""), date (date or period, or ""), desc (details and impact, or ""). No markdown, no backticks, just raw JSON.',
        messages=[{"role": "user", "content": req.text}]
    )
    return {"result": response.content[0].text}


@app.post("/gen")
async def generate_resume(req: GenRequest, username: str = Depends(get_current_user)):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    achievement_text = "\n\n".join(
        f"{i+1}. [{a.get('cat','').upper()}] {a.get('title','')}"
        f"{' at ' + a['org'] if a.get('org') else ''}"
        f"{' (' + a['date'] + ')' if a.get('date') else ''}"
        f"{chr(10) + '   Details: ' + a['desc'] if a.get('desc') else ''}"
        for i, a in enumerate(req.achievements)
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system="You are a professional resume writer. Generate clean, well-structured resumes in plain text format. Do not include 'References available upon request', any references section, or any notes/reminders asking the user to add more information.",
        messages=[{"role": "user", "content": (
            f"Generate a professional resume.\n\n"
            f"CANDIDATE:\nName: {req.name or '(not provided)'}\nEmail: {req.email or '(not provided)'}\n"
            f"Target Role: {req.role or '(not provided)'}\nLocation: {req.location or '(not provided)'}\n\n"
            f"ACHIEVEMENTS:\n{achievement_text}\n\n"
            f"INSTRUCTIONS:\n{req.prompt or 'Generate a clean, professional resume with concise bullet points organized by category.'}"
        )}]
    )
    return {"resume": response.content[0].text}


@app.get("/")
async def root():
    return {"message": "ReRe backend is running"}
