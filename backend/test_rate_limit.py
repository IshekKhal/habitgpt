
import requests
import time
import os
from dotenv import load_dotenv

# Load env to get backend URL
load_dotenv()
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://habitgpt-production.up.railway.app')

# Use stable endpoint (notifications) which has 10/min limit
URL = f"{BACKEND_URL.rstrip('/')}/api/notifications/generate"

print(f"Testing Rate Limit on: {URL}")

payload = {
    "user_name": "Test User",
    "habit_name": "Testing",
    "time_of_day": "morning",
    "coach_style": "gentle"
}

success_count = 0
blocked_count = 0

for i in range(15):
    try:
        response = requests.post(URL, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"Req {i+1}: ✅ 200 OK")
            success_count += 1
        elif response.status_code == 429:
            print(f"Req {i+1}: 🛑 429 Too Many Requests (Rate Limit Working!)")
            blocked_count += 1
        else:
            print(f"Req {i+1}: ⚠️ {response.status_code}")
    except Exception as e:
        print(f"Req {i+1}: ❌ Error: {e}")
    # time.sleep(0.1) # Fast spam

print("-" * 30)
print(f"Results: {success_count} Success, {blocked_count} Blocked")
if blocked_count > 0:
    print("✅ RATE LIMITING IS ACTIVE")
else:
    print("❌ RATE LIMITING FAILED (Or limit not reached)")
