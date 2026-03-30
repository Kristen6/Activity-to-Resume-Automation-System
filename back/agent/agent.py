import os
from openai import OpenAI

MODEL   = "gpt-5.1"

def ask(client, prompt: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def ping(api_key):
    client = OpenAI(api_key=api_key, base_url="https://api.jiekou.ai/openai")

    prompt = "Who are you?"
    print(f"Sending prompt : {prompt!r}")
    print("-" * 50)

    reply = ask(client, prompt)

    print(f"Agent response : {reply}")
    print("-" * 50)
    print("✅ Agent responded successfully!" if reply else "❌ Empty response received.")