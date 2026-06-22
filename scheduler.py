from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler

from poller import main as run_poll


def _timestamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


def run_poll_job() -> None:
    print(f"[{_timestamp()}] Poll started.")
    try:
        run_poll()
    finally:
        print(f"[{_timestamp()}] Poll finished.")


def main() -> None:
    scheduler = BlockingScheduler()
    scheduler.add_job(run_poll_job, "interval", seconds=60, max_instances=1, coalesce=True)

    print(f"[{_timestamp()}] Scheduler started. Polling every 60 seconds.")
    run_poll_job()
    scheduler.start()


if __name__ == "__main__":
    main()
