import sys
import os
import requests
import bcrypt
from dotenv import load_dotenv

# Ensure we can import from parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import db

# We assume uvicorn is running on port 8000
BASE_URL = "http://localhost:8000"

def test_endpoints():
    load_dotenv()
    print("Testing GET /courses/CMSC131/sections...")
    r = requests.get(f"{BASE_URL}/courses/CMSC131/sections")
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert len(data) > 0, "No sections found!"
    print(f"Scraped sections count: {len(data)}")
    print("Search test passed!")

    print("Setting up test user directly in DB...")
    email = "test_user_external_api@umd.edu"
    another_email = "another_user_external_api@umd.edu"
    test_section = "CMSC131-TEST9999"
    
    # Ensure test user 1 exists in db
    user = db.get_user_auth_by_email(email)
    if not user:
        password_hash = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.create_user_with_password("External Test 1", email, password_hash)
        print("Test user 1 created.")
    else:
        print("Test user 1 already exists.")

    # Ensure test user 2 exists in db
    another_user = db.get_user_auth_by_email(another_email)
    if not another_user:
        password_hash = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.create_user_with_password("External Test 2", another_email, password_hash)
        print("Test user 2 created.")
    else:
        print("Test user 2 already exists.")

    print("Logging in user 1 to get JWT token...")
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": "password123"
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    token1 = r.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    print("Logging in user 2 to get JWT token...")
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": another_email,
        "password": "password123"
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    token2 = r.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Ensure clean state: delete watch entry first if any exist
    requests.delete(f"{BASE_URL}/watchlist", json={"section_id": test_section}, headers=headers1)
    requests.delete(f"{BASE_URL}/watchlist", json={"section_id": test_section}, headers=headers2)

    # Try watching a section as User 1
    print("Testing watchlist add for User 1...")
    r = requests.post(f"{BASE_URL}/watchlist", json={
        "section_id": test_section
    }, headers=headers1)
    assert r.status_code == 200, f"Watchlist add failed: {r.text}"

    # Now add it again, should fail with 409 Conflict
    r = requests.post(f"{BASE_URL}/watchlist", json={
        "section_id": test_section
    }, headers=headers1)
    assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
    print("Duplicate watchlist checks passed!")

    # Test 403 Forbidden: User 2 tries to delete User 1's entry
    print("Testing 403 Forbidden deletion check (User 2 deletes User 1's watchlist)...")
    r = requests.delete(f"{BASE_URL}/watchlist", json={
        "section_id": test_section
    }, headers=headers2)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    print("403 check passed!")

    # Test 200 OK: User 1 deletes their own entry
    print("Testing 200 OK deletion check (User 1 deletes their own watchlist)...")
    r = requests.delete(f"{BASE_URL}/watchlist", json={
        "section_id": test_section
    }, headers=headers1)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    print("200 check passed!")

    # Test 404 Not Found: User 1 tries to delete it again (no one watches it now)
    print("Testing 404 Not Found deletion check...")
    r = requests.delete(f"{BASE_URL}/watchlist", json={
        "section_id": test_section
    }, headers=headers1)
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
    print("404 check passed!")

    # Test rate limiting on login endpoint (10 requests per 15 minutes)
    print("Testing Rate Limiting on login endpoint...")
    hit_429 = False
    for i in range(12):
        r = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "password123"
        })
        if r.status_code == 429:
            hit_429 = True
            data = r.json()
            assert data.get("detail") == "Too many requests. Please slow down and try again later.", f"Wrong 429 message detail: {data}"
            print(f"Hit 429 rate limit as expected on iteration {i+1}!")
            break
    assert hit_429, "Expected to trigger 429 Rate Limit but did not"
    print("Rate limit checks passed!")

if __name__ == "__main__":
    try:
        test_endpoints()
        print("ALL EXTERNAL API TESTS PASSED!")
    except Exception as e:
        print(f"API TEST FAILURE: {e}")
        sys.exit(1)
