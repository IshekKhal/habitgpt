import google.generativeai as genai
import os

key = "AIzaSyBZGvnjIhqU40hv19SstjgnG3S9lX7xq-E"
genai.configure(api_key=key)

print("Listing available models:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"List models failed: {e}")

print("\nTesting gemini-flash-latest...")
try:
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Hello")
    print(f"Success gemini-flash-latest! Response: {response.text}")
except Exception as e:
    print(f"Error gemini-flash-latest: {e}")
