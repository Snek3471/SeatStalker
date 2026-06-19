from datetime import datetime
import os

from dotenv import load_dotenv
import requests
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from db import (
    get_cached_open_seats,
    get_watched_sections,
    update_section_cache,
    get_unnotified_users_for_section,
    mark_watchlist_entry_notified,
    reset_watchlist_alerts,
)
from scraper import get_sections
from main import _send_email

BATCH_SIZE = 50
REGISTRATION_URL = "https://app.testudo.umd.edu/soc"

load_dotenv()


def _chunked(items: list[str], chunk_size: int) -> list[list[str]]:
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


def _fetch_sections_batch(section_ids: list[str]) -> list[dict]:
    try:
        return get_sections(section_ids)
    except Exception as exc:
        print(f"[{_timestamp()}] ERROR: Scraper failed to fetch sections: {exc}")
        return []



def _to_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _timestamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _send_seat_alerts(section_id: str, open_seats: int, recipient_emails: list[str]) -> None:
    subject = f"Seat available in {section_id}"
    body = (
        f"gang\n"
        f"a seat available in {section_id}.\n"
        f"go grab it before someone else does: https://testudo.umd.edu/\n"
        f"\n"
        f"your friendly neighborhood seat stalker\n"
        f"ps. better than the mckeldin one\n"
    )

    for recipient in recipient_emails:
        try:
            _send_email(recipient, subject, body)
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

                if new_open_seats > 0:
                    # Get all users watching this section who haven't been notified yet
                    unnotified = get_unnotified_users_for_section(section_id)
                    if unnotified:
                        emails = [item["email"] for item in unnotified]
                        print(
                            f"ALERT: {section_id} has {new_open_seats} seats. Notifying unnotified users: {', '.join(emails)}"
                        )
                        _send_seat_alerts(section_id, new_open_seats, emails)

                        # Mark notified
                        for item in unnotified:
                            mark_watchlist_entry_notified(item["email"], section_id)
                else:
                    # Reset alerts for this section so users get notified if a seat opens again
                    reset_watchlist_alerts(section_id)

                update_section_cache(section_id, new_open_seats, total_seats)

    except Exception as exc:
        print(f"[{_timestamp()}] ERROR: {exc}")


if __name__ == "__main__":
    main()
