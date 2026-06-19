import os
from bs4 import BeautifulSoup
import requests
import argparse
from dotenv import load_dotenv

load_dotenv()

TESTUDO_URL = "https://app.testudo.umd.edu/soc/search"
DEFAULT_SEMESTER = os.getenv("UMD_SEMESTER", "202608")


def get_sections(section_ids: list[str], semester: str = DEFAULT_SEMESTER) -> list[dict]:
    if not section_ids:
        return []

    normalized_ids = [section_id.strip().upper() for section_id in section_ids if section_id.strip()]
    if not normalized_ids:
        return []

    course_ids = []
    for section_id in normalized_ids:
        course_id = section_id.split("-", 1)[0]
        if course_id and course_id not in course_ids:
            course_ids.append(course_id)

    all_sections = []
    for course_id in course_ids:
        all_sections.extend(get_sections_from_testudo(course_id, semester))

    requested = set(normalized_ids)
    filtered_sections = []
    for section in all_sections:
        section_id = str(section.get("section_id", "")).upper()
        if section_id in requested:
            filtered_sections.append(
                {
                    "section_id": section.get("section_id", "N/A"),
                    "open_seats": section.get("open_seats"),
                    "seats": section.get("total_seats"),
                    "instructors": section.get("instructors", []),
                    "meetings": section.get("meetings", []),
                    "days_info": section.get("days_info", []),
                }
            )

    return filtered_sections


def get_sections_from_testudo(course_id: str, semester: str) -> list[dict]:
    url = (
        f"{TESTUDO_URL}?courseId={course_id}"
        f"&sectionId=&termId={semester}"
        "&_openSectionsOnly=on&creditCompare=%3E%3D&credits=0.0"
        "&courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on"
        "&_online=on&courseStartCompare=&courseStartHour=&courseStartMin="
        "&courseStartAM=&courseEndHour=&courseEndMin=&courseEndAM="
        "&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on"
        "&_classDay4=on&_classDay5=on"
    )

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"Request failed: {exc}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    courses = soup.find_all("div", class_="course")
    outputs = []

    for course in courses:
        sections_html = course.find_all("div", class_="section")

        for section_html in sections_html:
            section_id_html = section_html.find("span", class_="section-id")
            open_seats_html = section_html.find("span", class_="open-seats-count")
            total_seats_html = section_html.find("span", class_="total-seats-count")
            instructors_html = section_html.find_all("span", class_="section-instructor")

            section_number = section_id_html.get_text(strip=True) if section_id_html else None
            open_seats_text = open_seats_html.get_text(strip=True) if open_seats_html else "0"
            total_seats_text = total_seats_html.get_text(strip=True) if total_seats_html else "0"

            try:
                open_seats = int(open_seats_text)
            except ValueError:
                open_seats = 0

            try:
                total_seats = int(total_seats_text)
            except ValueError:
                total_seats = 0

            instructors = [
                instructor.get_text(strip=True)
                for instructor in instructors_html
                if instructor.get_text(strip=True)
            ]

            # Parse meeting times
            meetings = []
            days_info = []
            days_container = section_html.find("div", class_="class-days-container")
            if days_container:
                for row in days_container.find_all("div", class_="row"):
                    days_html = row.find("span", class_="section-days")
                    start_html = row.find("span", class_="class-start-time")
                    end_html = row.find("span", class_="class-end-time")
                    bldg_html = row.find("span", class_="building-code")
                    room_html = row.find("span", class_="class-room")

                    days = days_html.get_text(strip=True) if days_html else "TBA"
                    start_time = start_html.get_text(strip=True) if start_html else "TBA"
                    end_time = end_html.get_text(strip=True) if end_html else "TBA"
                    building = bldg_html.get_text(strip=True) if bldg_html else "TBA"
                    room = room_html.get_text(strip=True) if room_html else "TBA"

                    meeting_obj = {
                        "days": days,
                        "start_time": start_time,
                        "end_time": end_time,
                        "building": building,
                        "room": room,
                        "classtype": "",
                    }
                    meetings.append(meeting_obj)
                    days_info.append(meeting_obj)

            if section_number:
                if section_number.startswith(course_id):
                    section_id = section_number
                else:
                    section_id = f"{course_id}-{section_number}"

                outputs.append(
                    {
                        "section_id": section_id,
                        "open_seats": open_seats,
                        "total_seats": total_seats,
                        "instructors": instructors,
                        "meetings": meetings,
                        "days_info": days_info,
                    }
                )

    return outputs


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape UMD Testudo sections for a course.")
    parser.add_argument("course_id", nargs="?", default="CMSC131", help="Course ID to lookup, such as CMSC131")
    args = parser.parse_args()

    sections = get_sections_from_testudo(args.course_id, DEFAULT_SEMESTER)

    for section in sections:
        print(
            f"section_id: {section['section_id']}, open_seats: {section['open_seats']}, total_seats: {section['total_seats']}, instructors: {section['instructors']}, meetings: {section['meetings']}"
        )

