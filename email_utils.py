import os

import resend


def _send_email(to_email: str, subject: str, plain_text: str) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    sender_email = os.getenv("RESEND_SENDER_EMAIL")

    if not api_key or not sender_email:
        print("\n=== EMAIL SENT (MOCKED) ===")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{plain_text}")
        print("===========================\n")
        return

    resend.api_key = api_key
    try:
        resend.Emails.send({
            "from": sender_email,
            "to": [to_email],
            "subject": subject,
            "text": plain_text,
        })
    except Exception as exc:
        print(f"\n[Warning] Resend email sending failed: {exc}")
        raise RuntimeError(f"Resend email send failed: {exc}") from exc
