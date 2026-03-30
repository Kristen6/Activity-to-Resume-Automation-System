## Commonly used commands

### Deployment

> [!WARNING]
> Do this in the `/front` directory

```sh
docker build . -t rere:front
```

```sh
docker run --rm -t -p 3000:3000 rere:front
```