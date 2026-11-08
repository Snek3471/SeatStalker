import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_SENDER_EMAIL: string;
  POLL_SECRET: string;
  UMD_SEMESTER?: string;
}

interface WatchRow {
  id: number;
  section_id: string;
  notified_at: string | null;
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
  const sectionMatches = [...html.matchAll(/<span[^>]*class=["'][^"']*section-id[^"']*["'][^>]*>\s*([^<]+?)\s*<\/span>/gi)];
  const results: SectionResult[] = [];

  for (let index = 0; index < sectionMatches.length; index += 1) {
    const rawNumber = sectionMatches[index][1].trim().toUpperCase();
    const sectionId = rawNumber.startsWith(courseId) ? rawNumber : `${courseId}-${rawNumber}`;
    if (!wanted.has(sectionId)) {
      continue;
    }

    const matchIndex = sectionMatches[index].index ?? 0;
    const start = html.lastIndexOf('<div class="section', matchIndex);
    const nextStart = html.indexOf('<div class="section', matchIndex + 1);
    const block = html.slice(start < 0 ? matchIndex : start, nextStart < 0 ? html.length : nextStart);
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

  return results;
}

async function fetchCourse(courseId: string, semester: string, wanted: Set<string>): Promise<SectionResult[]> {
  const params = new URLSearchParams({
    courseId,
    sectionId: "",
    termId: semester,
    creditCompare: ">=",
    credits: "0.0",
    courseLevelFilter: "ALL",
    instructor: "",
    _facetoface: "on",
    _blended: "on",
    _online: "on",
    teachingCenter: "ALL",
    _classDay1: "on",
    _classDay2: "on",
    _classDay3: "on",
    _classDay4: "on",
    _classDay5: "on",
  });
  const response = await fetch(`${TESTUDO_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Testudo returned ${response.status} for ${courseId}`);
  }
  return parseSections(await response.text(), courseId, wanted);
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

async function pollOnce(env: Env): Promise<void> {
  const client = supabase(env);
  if (!(await acquireLock(client))) {
    console.log("Poll skipped because another run holds the lock.");
    return;
  }

  try {
    const { data: watchRows, error: watchError } = await client
      .from("watchlist")
      .select("id, section_id, notified_at, users!inner(email)")
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
    const selectedCourses = courseIds.slice(cursor, cursor + COURSE_BATCH_SIZE);
    const selectedIds = new Set(
      rows
        .filter((row) => selectedCourses.includes(row.section_id.split("-", 1)[0].toUpperCase()))
        .map((row) => row.section_id.toUpperCase()),
    );
    const results: SectionResult[] = [];

    for (const courseId of selectedCourses) {
      results.push(...await fetchCourse(courseId, env.UMD_SEMESTER ?? "202701", selectedIds));
    }

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

    const nextCursor = courseIds.length === 0 ? 0 : (cursor + selectedCourses.length) % courseIds.length;
    const { error: stateWriteError } = await client.from("poller_state").upsert(
      { key: STATE_KEY, cursor: nextCursor, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (stateWriteError) {
      throw new Error(`Could not save poller state: ${stateWriteError.message}`);
    }
    console.log(`Poll complete: ${results.length} sections checked.`);
  } finally {
    await releaseLock(client);
  }
}

async function runSafely(env: Env): Promise<void> {
  try {
    await pollOnce(env);
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
