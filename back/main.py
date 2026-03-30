from fastapi import FastAPI

# haha, as
from agent import agent
from util import init
 
app = FastAPI()
conf = init.env()

# authentication
# {username, passwd} -> {token}
@app.post("/auth")
async def auth():
    pass

# save user achiev data
# [{data1}, {data2}] -> {code}
@app.post("/save")
async def save():
    pass

# get user achiev data
# TODO: get or post method? Because tokens can be put inside the HTML header
# session token should be included / or JWT
# {token} -> [{data1}, {data2}]
@app.get("/get")
async def get():
    pass

# generate
# {token} -> {pdf file}
@app.get("/gen")
async def gen():
    api_key = conf.get("JIEKOU_API_KEY")
    agent.ping(api_key)

@app.get("/")
async def root():
    return {"message": "Hello World"}