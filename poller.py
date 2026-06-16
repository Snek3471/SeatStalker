import requests

COURSE_ID = "CMSC131"
API_URL = f"https://api.umd.io/v1/courses/{COURSE_ID}/sections"


def get_course_info(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        return {"message": f"Failed to retrieve page: {exc}"}
    except ValueError as exc:
        return {"message": f"Failed to decode JSON response: {exc}"}

    sections = payload.get("sections", payload) if isinstance(payload, dict) else payload
    outputs = []

    for section in sections:
        outputs.append(
            {
                "section_id": section.get("section_id", "N/A"),
                "open_seats": section.get("open_seats"),
                "seats": section.get("seats"),
            }
        )

    return outputs


def main() -> None:
    sections = get_course_info(API_URL)

    if isinstance(sections, dict):
        print(sections["message"])
        return

    for section in sections:
        print(
            f"section_id: {section['section_id']}, open_seats: {section['open_seats']}, seats: {section['seats']}"
        )


if __name__ == "__main__":
    main()
