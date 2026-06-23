from datetime import datetime

from dotenv import load_dotenv

from db import (
    get_section_cache_entry,
    get_watched_sections,
    get_watchers_with_notification_status,
    mark_watchlist_notified,
    reset_watchlist_notifications,
    update_section_cache,
)
from scraper import get_sections
from email_utils import _send_email

BATCH_SIZE = 50

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


def _section_is_available(open_seats: int, waitlist: int) -> bool:
    return open_seats > 0 and waitlist == 0


def _send_seat_alert(section_id: str, recipient_email: str) -> None:
    subject = f"Seat available in {section_id}"
    body = (
        f"gang\n"
        f"a seat available in {section_id}.\n"
        f"go grab it before someone else does: https://testudo.umd.edu/\n"
        f"\n"
        f"your friendly neighborhood seat stalker\n"
    )
    try:
        _send_email(recipient_email, subject, body)
    except Exception as exc:
        print(f"[{_timestamp()}] ERROR: Failed to send email to {recipient_email} for {section_id}: {exc}")


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

                open_seats = _to_int(section.get("open_seats"))
                total_seats = _to_int(section.get("seats"))
                waitlist = _to_int(section.get("waitlist"))
                is_available = _section_is_available(open_seats, waitlist)

                if is_available:
                    watchers = get_watchers_with_notification_status(section_id)
                    for watcher in watchers:
                        if watcher["notified_at"] is not None:
                            continue
                        print(
                            f"ALERT: {section_id} is available "
                            f"({open_seats} open, waitlist {waitlist}). "
                            f"Notifying: {watcher['email']}"
                        )
                        _send_seat_alert(section_id, watcher["email"])
                        mark_watchlist_notified(watcher["watchlist_id"])
                else:
                    reset_watchlist_notifications(section_id)

                update_section_cache(section_id, open_seats, total_seats, waitlist, is_available)

    except Exception as exc:
        print(f"[{_timestamp()}] ERROR: {exc}")


if __name__ == "__main__":
    main()
