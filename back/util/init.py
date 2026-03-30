from dotenv import dotenv_values

# environment file path
ENV_PATH = ".env"

def env() -> dict:
    """
    Read .env file and setup environment variables, returns a directionary of those env variables
    """
    return dotenv_values(ENV_PATH)