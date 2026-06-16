from datetime import datetime
import os

from dotenv import load_dotenv
import requests
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from db import (
    get_cached_open_seats,
    get_users_watching,
    get_watched_sections,
    update_section_cache,
)

BATCH_SIZE = 50
BATCH_SECTIONS_URL = "https://api.umd.io/v1/courses/sections"
REGISTRATION_URL = "https://app.testudo.umd.edu/soc"

load_dotenv()


def _chunked(items: list[str], chunk_size: int) -> list[list[str]]:
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


def _fetch_sections_batch(section_ids: list[str]) -> list[dict]:
    if not section_ids:
        return []

    url = f"{BATCH_SECTIONS_URL}/{','.join(section_ids)}"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    payload = response.json()

    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return payload.get("sections", [])
    return []


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _timestamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _get_sendgrid_config() -> tuple[str | None, str | None]:
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDGRID_SENDER_EMAIL") or os.getenv("SENDER_EMAIL")
    return api_key, sender_email


def _send_seat_alerts(section_id: str, open_seats: int, recipient_emails: list[str]) -> None:
    api_key, sender_email = _get_sendgrid_config()

    if not api_key or not sender_email:
        print(
            f"[{_timestamp()}] ERROR: Missing SENDGRID_API_KEY or SENDGRID_SENDER_EMAIL in .env. Skipping email alerts for {section_id}."
        )
        return

    client = SendGridAPIClient(api_key)
    subject = f"Seat available in {section_id}"
    body = (
        f"A seat opened up in {section_id}.\n"
        f"Open seats available: {open_seats}.\n"
        f"Register here: {REGISTRATION_URL}"
    )

    for recipient in recipient_emails:
        try:
            message = Mail(
                from_email=sender_email,
                to_emails=recipient,
                subject=subject,
                plain_text_content=body,
            )
            client.send(message)
        except Exception as exc:
            print(f"[{_timestamp()}] ERROR: Failed to send email to {recipient} for {section_id}: {exc}")


def main() -> None:
    try:
        watched_section_ids = get_watched_sections()
        if not watched_section_ids:
            print(f"[{_timestamp()}] No watched sections found.")
            return

        for section_id_chunk in _chunked(watched_section_ids, BATCH_SIZE):
            sections = _fetch_sections_batch(section_id_chunk)

            for section in sections:
                section_id = section.get("section_id")
                if not section_id:
                    continue

                new_open_seats = _to_int(section.get("open_seats"))
                total_seats = _to_int(section.get("seats"))
                old_open_seats = get_cached_open_seats(section_id)

                if old_open_seats == 0 and new_open_seats > 0:
                    emails = get_users_watching(section_id)
                    print(
                        f"ALERT: {section_id} opened {new_open_seats} seats. Notifying: {', '.join(emails) if emails else 'no subscribers'}"
                    )
                    if emails:
                        _send_seat_alerts(section_id, new_open_seats, emails)

                update_section_cache(section_id, new_open_seats, total_seats)

    except Exception as exc:
        print(f"[{_timestamp()}] ERROR: {exc}")


if __name__ == "__main__":
    main()
