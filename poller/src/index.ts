import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_SENDER_EMAIL: string;
  POLL_SECRET: string;
  UMD_SEMESTER?: string;
  HEALTHCHECK_URL?: string;
}

interface WatchRow {
  id: number;
  section_id: string;
  notified_at: string | null;
  added_at: string | null;
  users: { email: string } | { email: string }[];
}

interface SectionResult {
  section_id: string;
  open_seats: number;
  total_seats: number;
  waitlist: number;
  is_available: boolean;
}

const TESTUDO_URL = "https://app.testudo.umd.edu/soc/search";
const STATE_KEY = "course_cursor";
const COURSE_BATCH_SIZE = 30;
const NEW_WATCH_WINDOW_MS = 15 * 60 * 1000;

function supabase(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asEmail(user: WatchRow["users"]): string {
  return Array.isArray(user) ? user[0]?.email ?? "" : user.email;
}

function integerIn(block: string, className: string): number {
  const match = block.match(
    new RegExp(`<span[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>\\s*(\\d+)`, "i"),
  );
  return match ? Number(match[1]) : 0;
}

function parseSections(html: string, courseId: string, wanted: Set<string>): SectionResult[] {
  // Each section starts at <div class="section ..."> (not section-id-container etc.).
  const starts = [...html.matchAll(/<div class="section[ "]/gi)].map((match) => match.index ?? 0);
  // A search for "CMSC25" style ids can return other courses too, so remember which course each section belongs to.
  const courseMarkers = [...html.matchAll(/<div class="course-id">\s*([A-Z0-9]+)/gi)].map((match) => ({
    index: match.index ?? 0,
    id: match[1].toUpperCase(),
  }));
  const results: SectionResult[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const block = html.slice(starts[index], starts[index + 1] ?? html.length);
    const idMatch = block.match(
      /<span[^>]*class=["'][^"']*section-id[^"']*["'][^>]*>\s*([^<]+?)\s*<\/span>/i,
    );
    if (!idMatch) {
      continue;
    }

    let owner: string | undefined;
    for (const marker of courseMarkers) {
      if (marker.index < starts[index]) {
        owner = marker.id;
      } else {
        break;
      }
    }
    if (owner !== undefined && owner !== courseId) {
      continue;
    }

    const rawNumber = idMatch[1].trim().toUpperCase();
    const sectionId = rawNumber.startsWith(courseId) ? rawNumber : `${courseId}-${rawNumber}`;
    if (!wanted.has(sectionId)) {
      continue;
    }

    const openSeats = integerIn(block, "open-seats-count");
    const waitlist = integerIn(block, "waitlist-count");

    results.push({
      section_id: sectionId,
      open_seats: openSeats,
      total_seats: integerIn(block, "total-seats-count"),
      waitlist,
      is_available: openSeats > 0 && waitlist === 0,
    });
  }

  return [...new Map(results.map((result) => [result.section_id, result])).values()];
}

async function fetchCourse(courseId: string, semester: string, wanted: Set<string>): Promise<SectionResult[]> {
  // Same query string the Python scraper used (including the empty start/end time params).
  const url =
    `${TESTUDO_URL}?courseId=${encodeURIComponent(courseId)}&sectionId=&termId=${encodeURIComponent(semester)}` +
    "&creditCompare=%3E%3D&credits=0.0&courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on&_online=on" +
    "&courseStartCompare=&courseStartHour=&courseStartMin=&courseStartAM=&courseEndHour=&courseEndMin=&courseEndAM=" +
    "&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on&_classDay4=on&_classDay5=on";
  const response = await fetch(url, {
    headers: { "User-Agent": "SeatStalker/1.0", Accept: "text/html" },
  });
  if (!response.ok) {
    throw new Error(`Testudo returned ${response.status} for ${courseId}`);
  }
  const html = await response.text();
  const parsed = parseSections(html, courseId, wanted);
  console.log(`${courseId}: HTTP ${response.status}, ${html.length} bytes, matched ${parsed.length} of ${wanted.size} wanted sections`);
  return parsed;
}

async function sendSeatAlerts(env: Env, recipients: Array<{ email: string; sectionId: string }>): Promise<void> {
  if (recipients.length === 0) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      recipients.map(({ email, sectionId }) => ({
        from: env.RESEND_SENDER_EMAIL,
        to: [email],
        subject: `Seat available in ${sectionId}`,
        text: `gang\na seat available in ${sectionId}.\ngo grab it before someone else does: https://testudo.umd.edu/\n\nyour friendly neighborhood seat stalker\n`,
      })),
    ),
  });
  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
  }
}

async function acquireLock(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("try_acquire_poller_lock");
  if (error) {
    throw new Error(`Could not acquire poller lock: ${error.message}`);
  }
  return data === true;
}

async function releaseLock(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc("release_poller_lock");
  if (error) {
    console.error(`Could not release poller lock: ${error.message}`);
  }
}

async function pollOnce(env: Env): Promise<boolean> {
  const client = supabase(env);
  if (!(await acquireLock(client))) {
    console.log("Poll skipped because another run holds the lock.");
    return false;
  }

  try {
    const { data: watchRows, error: watchError } = await client
      .from("watchlist")
      .select("id, section_id, notified_at, added_at, users!inner(email)")
      .order("section_id");
    if (watchError) {
      throw new Error(`Could not load watchlist: ${watchError.message}`);
    }

    const rows = (watchRows ?? []) as WatchRow[];
    const courseIds = [...new Set(rows.map((row) => row.section_id.split("-", 1)[0].toUpperCase()))].sort();
    const { data: state, error: stateError } = await client
      .from("poller_state")
      .select("cursor")
      .eq("key", STATE_KEY)
      .maybeSingle();
    if (stateError) {
      throw new Error(`Could not load poller state: ${stateError.message}`);
    }

    const cursor = courseIds.length === 0 ? 0 : (Number(state?.cursor ?? 0) % courseIds.length);
    const rotatingCourses = courseIds.slice(cursor, cursor + COURSE_BATCH_SIZE);
    // Courses with watches added in the last few minutes are checked on every run, so a new watch alerts within ~2 minutes.
    const courseOf = (row: WatchRow) => row.section_id.split("-", 1)[0].toUpperCase();
    const recentCourses = rows
      .filter((row) => {
        if (!row.added_at) {
          return false;
        }
        const stamp = /(Z|[+-]\d\d:?\d\d)$/.test(row.added_at) ? row.added_at : `${row.added_at}Z`;
        return Date.now() - Date.parse(stamp) < NEW_WATCH_WINDOW_MS;
      })
      .map(courseOf);
    const selectedCourses = [...new Set([...recentCourses, ...rotatingCourses])];
    const selectedIds = new Set(
      rows
        .filter((row) => selectedCourses.includes(row.section_id.split("-", 1)[0].toUpperCase()))
        .map((row) => row.section_id.toUpperCase()),
    );
    const results: SectionResult[] = [];
    console.log(`Watchlist rows: ${rows.length}; polling ${selectedCourses.length} of ${courseIds.length} courses (new watches: ${recentCourses.length})`);

    for (const courseId of selectedCourses) {
      try {
        results.push(...await fetchCourse(courseId, env.UMD_SEMESTER ?? "202701", selectedIds));
      } catch (error) {
        // One bad course page must not block every other course (or keep the cursor stuck).
        console.error(`Skipping ${courseId}:`, error);
      }
    }

    const uniqueResults = [...new Map(results.map((result) => [result.section_id, result])).values()];
    results.length = 0;
    results.push(...uniqueResults);
    const sectionIds = results.map((result) => result.section_id);
    if (sectionIds.length > 0) {
      const { data: previousCache, error: cacheReadError } = await client
        .from("section_cache")
        .select("section_id, open_seats, total_seats, waitlist, is_available")
        .in("section_id", sectionIds);
      if (cacheReadError) {
        throw new Error(`Could not load section cache: ${cacheReadError.message}`);
      }

      const previous = new Map((previousCache ?? []).map((row) => [row.section_id, row]));
      const changed = results.filter((result) => {
        const old = previous.get(result.section_id);
        return !old
          || old.open_seats !== result.open_seats
          || old.total_seats !== result.total_seats
          || old.waitlist !== result.waitlist
          || Boolean(old.is_available) !== result.is_available;
      });
      if (changed.length > 0) {
        const { error: cacheWriteError } = await client.from("section_cache").upsert(
          changed.map((result) => ({
            section_id: result.section_id,
            open_seats: result.open_seats,
            total_seats: result.total_seats,
            waitlist: result.waitlist,
            is_available: result.is_available ? 1 : 0,
            last_checked: new Date().toISOString(),
          })),
          { onConflict: "section_id" },
        );
        if (cacheWriteError) {
          throw new Error(`Could not update section cache: ${cacheWriteError.message}`);
        }
      }

      const availableIds = new Set(results.filter((result) => result.is_available).map((result) => result.section_id));
      const unavailableIds = sectionIds.filter((sectionId) => !availableIds.has(sectionId));
      const pending = rows.filter(
        (row) => availableIds.has(row.section_id.toUpperCase()) && row.notified_at === null && asEmail(row.users),
      );
      await sendSeatAlerts(
        env,
        pending.map((row) => ({ email: asEmail(row.users), sectionId: row.section_id })),
      );

      if (pending.length > 0) {
        const { error } = await client
          .from("watchlist")
          .update({ notified_at: new Date().toISOString() })
          .in("id", pending.map((row) => row.id));
        if (error) {
          throw new Error(`Could not mark notifications sent: ${error.message}`);
        }
      }
      if (unavailableIds.length > 0) {
        const { error } = await client
          .from("watchlist")
          .update({ notified_at: null })
          .in("section_id", unavailableIds);
        if (error) {
          throw new Error(`Could not reset notifications: ${error.message}`);
        }
      }
    }

    const nextCursor = courseIds.length === 0 ? 0 : (cursor + rotatingCourses.length) % courseIds.length;
    const { error: stateWriteError } = await client.from("poller_state").upsert(
      { key: STATE_KEY, cursor: nextCursor, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (stateWriteError) {
      throw new Error(`Could not save poller state: ${stateWriteError.message}`);
    }
    console.log(`Poll complete: ${results.length} sections checked.`);
    return true;
  } finally {
    await releaseLock(client);
  }
}

// Pings a healthchecks.io-style URL after each successful poll. If the pings stop, the monitor emails you.
async function pingHeartbeat(env: Env): Promise<void> {
  if (!env.HEALTHCHECK_URL) {
    return;
  }
  try {
    await fetch(env.HEALTHCHECK_URL, { method: "POST", signal: AbortSignal.timeout(5000) });
  } catch (error) {
    console.error("Heartbeat ping failed:", error);
  }
}

async function runSafely(env: Env): Promise<void> {
  try {
    if (await pollOnce(env)) {
      await pingHeartbeat(env);
    }
  } catch (error) {
    console.error("Poll failed:", error);
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runSafely(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/run") {
      return new Response("Not found", { status: 404 });
    }
    if (request.headers.get("Authorization") !== `Bearer ${env.POLL_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    await runSafely(env);
    return new Response("Poll finished", { status: 200 });
  },
};