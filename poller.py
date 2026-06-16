from scraper import get_sections

SECTION_IDS = [
    "CMSC131-0101",
    "CMSC131-0102",
]


def main() -> None:
    sections = get_sections(SECTION_IDS)

    if not sections:
        print("No sections returned.")
        return

    for section in sections:
        print(
            f"section_id: {section.get('section_id', 'N/A')}, open_seats: {section.get('open_seats')}, seats: {section.get('seats')}"
        )


if __name__ == "__main__":
    main()
