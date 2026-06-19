import sys
import requests
import time

# We assume uvicorn is running on port 8000
BASE_URL = "http://localhost:8000"

def test_endpoints():
    print("Testing GET /courses/CMSC131/sections...")
    r = requests.get(f"{BASE_URL}/courses/CMSC131/sections")
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert len(data) > 0, "No sections found!"
    print(f"Scraped sections count: {len(data)}")
    print("Search test passed!")

    print("Testing duplicate watchlist checks...")
    email = "test_user_external_api@umd.edu"
    
    # Register test user
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "External Test",
        "email": email,
        "password": "password123"
    })
    # If user already exists (409), it's fine
    if r.status_code == 409:
        print("User already exists, continuing...")
    else:
        assert r.status_code == 200, f"Register failed: {r.text}"

    # Try watching a section
    r = requests.post(f"{BASE_URL}/watchlist", json={
        "email": email,
        "section_id": "CMSC131-0101"
    })
    # If already watching (409), we remove it first to test clean flow
    if r.status_code == 409:
        # Delete first
        requests.delete(f"{BASE_URL}/watchlist", json={
            "email": email,
            "section_id": "CMSC131-0101"
        })
        # Add again
        r = requests.post(f"{BASE_URL}/watchlist", json={
            "email": email,
            "section_id": "CMSC131-0101"
        })
    
    assert r.status_code == 200, f"Watchlist add failed: {r.text}"

    # Now add it again, should fail with 409 Conflict
    r = requests.post(f"{BASE_URL}/watchlist", json={
        "email": email,
        "section_id": "CMSC131-0101"
    })
    assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
    print("Duplicate watchlist checks passed!")

if __name__ == "__main__":
    try:
        test_endpoints()
        print("ALL EXTERNAL API TESTS PASSED!")
    except Exception as e:
        print(f"API TEST FAILURE: {e}")
        sys.exit(1)
