// Real concurrent Postgres sessions, not an in-memory booking simulation.
// Requires a disposable LOCAL Supabase database and the psql client.
import { spawn } from "node:child_process";

const dbUrl = process.env.EMPR_DB_TEST_URL;
if (!dbUrl) throw new Error("EMPR_DB_TEST_URL is required; never run this against production.");
if (!/127\.0\.0\.1|localhost/.test(new URL(dbUrl).hostname)) {
  throw new Error("Concurrency test is restricted to localhost.");
}
function psql(query, firstOutput) {
  return new Promise((resolve, reject) => {
    const proc = spawn("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "--dbname", dbUrl, "-c", query]);
    let stdout = "", stderr = "", first = false;
    proc.stdout.on("data", chunk => {
      stdout += String(chunk);
      if (!first && stdout.trim()) {
        first = true;
        firstOutput?.();
      }
    });
    proc.stderr.on("data", chunk => { stderr += String(chunk); });
    proc.once("error", reject);
    proc.once("close", code => resolve({ code, stdout, stderr }));
  });
}
const offering = "50000000-0000-4000-8000-000000000001";
const slot = "50000000-0000-4000-8000-000000000002";
const setup = await psql(`
insert into public.offerings (id,slug,title,kind,published,accepting_bookings)
values ('${offering}','pgtest-concurrency','Concurrency test','class',true,true);
insert into public.booking_slots
(id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,requires_payment)
values ('${slot}','${offering}',now()+interval '2 days',now()+interval '2 days 1 hour',
        'Europe/London',1,1,true,false);
`);
if (setup.code !== 0) throw Error("Cannot set up concurrency fixture: " + setup.stderr);
let notifyStarted;
const started = new Promise(resolve => { notifyStarted = resolve; });
const first = psql(`
begin;
select id from private.reserve_booking_hold(
  '${offering}','${slot}','paralleluser1',1,'paralleltestkey000001',15
);
select pg_sleep(2);
commit;
`, notifyStarted);
await Promise.race([
  started,
  new Promise((_, reject) => setTimeout(() => reject(Error("First reservation did not start")), 10000))
]);
const second = psql(`
select id from private.reserve_booking_hold(
  '${offering}','${slot}','paralleluser2',1,'paralleltestkey000002',15
);
`);
const [a, b] = await Promise.all([first, second]);
if (a.code !== 0) throw Error("First reservation failed: " + a.stderr);
if (b.code === 0 || !b.stderr.includes("Booking capacity exceeded")) {
  throw Error("Second reservation should be rejected by the same-slot lock: " + JSON.stringify(b));
}
const count = await psql(`select count(*) from public.bookings where slot_id='${slot}' and status='held';`);
if (count.code !== 0 || count.stdout.trim() !== "1") {
  throw Error("Expected exactly one hold after concurrent requests: " + JSON.stringify(count));
}
console.log("PASS: two concurrent sessions, one reservation, no double booking.");
