import anthropic

MODEL = "claude-sonnet-4-6"

def ask(client, prompt: str) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

def ping(api_key):
    client = anthropic.Anthropic(api_key=api_key)

    prompt = "Who are you?"
    print(f"Sending prompt : {prompt!r}")
    print("-" * 50)

    reply = ask(client, prompt)

    print(f"Agent response : {reply}")
    print("-" * 50)
    print("✅ Agent responded successfully!" if reply else "❌ Empty response received.")