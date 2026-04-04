# Development

Setup virtual environment and install dependencies:
```sh
cd back
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file (see `.env.example`):
```sh
cp .env.example .env
# then edit .env and fill in your keys
```

Run:
```sh
fastapi dev
```

# Deployment

Build docker image:
```sh
cd back
docker build . -t rere:back
```

Run docker image:
```sh
docker run --rm -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key_here \
  -e SECRET_KEY=your_secret_key_here \
  -t rere:back
```
