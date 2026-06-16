from bs4 import BeautifulSoup
import requests
import argparse

TESTUDO_URL = "https://app.testudo.umd.edu/soc/search"
DEFAULT_SEMESTER = "202608"


def get_sections(course_id: str, semester: str) -> list[dict]:
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
                    }
                )

    return outputs


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape UMD Testudo sections for a course.")
    parser.add_argument("course_id", nargs="?", default="CMSC131", help="Course ID to lookup, such as CMSC131")
    args = parser.parse_args()

    sections = get_sections(args.course_id, DEFAULT_SEMESTER)

    for section in sections:
        print(
            f"section_id: {section['section_id']}, open_seats: {section['open_seats']}, total_seats: {section['total_seats']}, instructors: {section['instructors']}"
        )
