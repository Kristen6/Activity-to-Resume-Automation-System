# Development

Install fastapi
```sh
cd back
python3 -m venv .venv
source .venv/bin/activate
pip install "fastapi[standard]"
```

Run
```
fastapi dev
```

# Deployment

Build docker image
```sh
cd back
docker build . -t rere:back
```

Run docker image
```sh
cd back
docker run --rm -p 8000:8000 -t rere:back
```