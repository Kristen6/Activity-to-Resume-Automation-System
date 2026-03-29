## Commonly used commands

### Deployment

> [!WARNING]
> Do this in the `/front` directory

```sh
docker build . -t hci:rere
```

```sh
docker run --rm -t -p 3000:3000 hci:rere
```