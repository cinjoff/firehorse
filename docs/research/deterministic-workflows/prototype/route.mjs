// Throwaway prototype for #307. The Firehorse route as a @statelyai/agent machine.
//
// No model and no Superset. Every session is scripted, and so is every Jev pick.
// The point is to react to the shape: the states, where code decides, where Jev
// decides, where a person decides, and what the event log says afterwards.
//
// Run: npm install && node route.mjs [happy|red-gate|fog-jev|fog-low]

import { getInteraction, runAgent, setupAgent } from "@statelyai/agent";
import { createInMemoryEventLogStore } from "@statelyai/agent/log";
import { lintAgentMachine } from "@statelyai/agent/testing";
import { createAsyncLogic } from "xstate";

// The #305 threshold: a Jev pick below it is treated as "None of these."
const JEV_THRESHOLD = 0.8;
// A red gate re-enters build this many times before a person is asked.
const MAX_BUILD_ATTEMPTS = 2;

// ── The machine ──────────────────────────────────────────────────────────────
//
// Guards read only `context`, and `context` changes only through events.
// Everything a guard needs (the frontier, the fog, the gate result) arrives as
// the SESSION_DONE payload, gathered by the host from the tracker and a re-run
// gate. That is what keeps `replay` deterministic. The first version read the
// tracker live from inside the guards, and resuming threw
// AgentReplayDivergenceError, because the world had moved since the log was written.

const agent = setupAgent({
  models: { jev: "typesafe-ai/jev" },
  events: {
    SESSION_DONE: {}, // payload: { evidence }. This is the outcome line (#303), confirmed by the host
    SESSION_FAILED: {},
    GRADUATE_FOG: {}, // the legal events Jev or a person may pick
    SPEC_IT: {},
    NONE_OF_THESE: {},
    RETRY_BUILD: {},
    ABANDON: {},
  },
  isIdle: (s) => s.hasTag("awaiting-session") || s.hasTag("awaiting-human"),
});

// One step = start a Superset session, then wait for it to report back.
// Short-lived host (#304): the process may exit in any `*Wait` state.
const session = (step, next) => ({
  invoke: {
    src: "startSession",
    input: ({ context }) => ({ step, ticket: context.ticket, mapId: context.mapId }),
    onDone: { target: next },
    onError: { target: "failed" },
  },
});

const done = (target) => ({
  SESSION_DONE: ({ event }) => ({ target, context: { evidence: event.evidence } }),
  SESSION_FAILED: { target: "failed" },
});

export const routeMachine = agent.createMachine({
  id: "firehorse-route",
  context: ({ input }) => ({
    mapId: input.mapId,
    ticket: null,
    buildAttempts: 0,
    evidence: input.evidence, // the tracker as the run found it
  }),
  initial: "mapChoose",
  states: {
    // ── map: resolve one ticket per session until nothing is left to decide.
    mapChoose: {
      type: "choice",
      // Code: the frontier query first, then the two ways a map can be done.
      choice: ({ context: { evidence } }) =>
        evidence.frontier.length > 0
          ? { target: "mapSession", context: { ticket: evidence.frontier[0] } }
          : evidence.blocked > 0
            ? { target: "mapBlocked" }
            : evidence.fog === 0
              ? { target: "specSession", context: { ticket: null } } // the way is clear
              : // No children, but fog remains. #301 found no handoff covers this,
                // so it is a judgement: a Jev seam.
                { target: "mapFogJudgement", context: { ticket: null } },
    },
    mapSession: session("map", "mapWait"),
    mapWait: { tags: ["awaiting-session"], on: done("mapChoose") },
    mapBlocked: {
      tags: ["awaiting-human"],
      meta: {
        interaction: {
          label: "Every child of the map is blocked. Unblock one, or stop.",
          events: { ABANDON: { label: "Stop the run" } },
        },
      },
      on: { ABANDON: { target: "abandoned" } },
    },
    mapFogJudgement: {
      invoke: {
        src: "agent.decide",
        input: () => ({
          model: "jev",
          name: "fogOrSpec",
          prompt:
            "The map has no open tickets, but its Not yet specified section still has entries. " +
            "Is any of it sharp enough to ticket now, or is the way clear enough to spec?",
          allowedEvents: ["GRADUATE_FOG", "SPEC_IT", "NONE_OF_THESE"],
        }),
        onError: { target: "mapFogHuman" },
      },
      on: {
        GRADUATE_FOG: { target: "mapGraduateSession" },
        SPEC_IT: { target: "specSession" },
        NONE_OF_THESE: { target: "mapFogHuman" },
      },
    },
    // #305: below the threshold, on "None", or with no key, the person picks from today's ▶ Next block.
    mapFogHuman: {
      tags: ["awaiting-human"],
      meta: {
        interaction: {
          label: "Jev was not confident. The map has no open tickets but still has fog:",
          events: {
            GRADUATE_FOG: { label: "/firehorse:map <map> · one more decision surfaced" },
            SPEC_IT: { label: "/firehorse:spec <map> · the way is clear" },
          },
        },
      },
      on: { GRADUATE_FOG: { target: "mapGraduateSession" }, SPEC_IT: { target: "specSession" } },
    },
    mapGraduateSession: session("map-graduate", "mapGraduateWait"),
    mapGraduateWait: { tags: ["awaiting-session"], on: done("mapChoose") },

    // ── spec and tickets: one session each, no judgement in between.
    specSession: session("spec", "specWait"),
    specWait: { tags: ["awaiting-session"], on: done("ticketsSession") },
    ticketsSession: session("tickets", "ticketsWait"),
    ticketsWait: {
      tags: ["awaiting-session"],
      on: {
        SESSION_DONE: ({ context, event }) => ({
          target: "buildSession",
          context: { evidence: event.evidence, buildAttempts: context.buildAttempts + 1 },
        }),
        SESSION_FAILED: { target: "failed" },
      },
    },

    // ── build: the host re-runs the gate after each session; a red gate may retry, then a person decides.
    buildSession: session("build", "buildWait"),
    buildWait: { tags: ["awaiting-session"], on: done("gateCheck") },
    gateCheck: {
      type: "choice",
      choice: ({ context }) =>
        context.evidence.gate === "green"
          ? { target: "shipSession" }
          : context.buildAttempts < MAX_BUILD_ATTEMPTS
            ? { target: "buildSession", context: { buildAttempts: context.buildAttempts + 1 } }
            : { target: "gateRedHuman" },
    },
    gateRedHuman: {
      tags: ["awaiting-human"],
      meta: {
        interaction: {
          label: `The gate stayed red after ${MAX_BUILD_ATTEMPTS} build sessions.`,
          events: {
            RETRY_BUILD: { label: "Run one more build session" },
            ABANDON: { label: "Stop the run" },
          },
        },
      },
      on: {
        RETRY_BUILD: ({ context }) => ({
          target: "buildSession",
          context: { buildAttempts: context.buildAttempts + 1 },
        }),
        ABANDON: { target: "abandoned" },
      },
    },

    // ── ship
    shipSession: session("ship", "shipWait"),
    shipWait: { tags: ["awaiting-session"], on: done("shipped") },

    shipped: { type: "final" },
    abandoned: { type: "final" },
    failed: { type: "final" },
  },
});

// ── The world ────────────────────────────────────────────────────────────────
// Stand-ins for the tracker and the gate. The host reads them after each
// session and hands the machine a snapshot of them as evidence.

function createWorld(w) {
  w = structuredClone(w);
  return {
    evidence: () => ({
      frontier: w.frontier.filter((t) => !t.closed && !t.blocked).map((t) => t.id),
      blocked: w.frontier.filter((t) => !t.closed && t.blocked).length,
      fog: w.fog.length,
      gate: w.gate ?? "not-run",
    }),
    // What a session did to the world. The real host sees this in git and the tracker.
    apply(step, ticket) {
      if (step === "map") w.frontier.find((t) => t.id === ticket).closed = true;
      if (step === "map-graduate") w.frontier.push(...w.fog.splice(0).map((id) => ({ id })));
      // #299: the gate is re-run by the host after a build session, never read from prose.
      if (step === "build") w.gate = w.gateRuns.length > 1 ? w.gateRuns.shift() : w.gateRuns[0];
    },
  };
}

// ── Scenarios ────────────────────────────────────────────────────────────────

const scenarios = {
  happy: {
    world: { frontier: [{ id: 301 }, { id: 302 }], fog: [], gateRuns: ["green"] },
  },
  "red-gate": {
    world: { frontier: [{ id: 301 }], fog: [], gateRuns: ["red", "red", "green"] },
    human: ["RETRY_BUILD"],
  },
  "fog-jev": {
    world: { frontier: [{ id: 301 }], fog: [310], gateRuns: ["green"] },
    jev: [
      { pick: "GRADUATE_FOG", p: 0.91 },
      { pick: "SPEC_IT", p: 0.88 },
    ],
  },
  "fog-low": {
    world: { frontier: [], fog: [310], gateRuns: ["green"] },
    jev: [{ pick: "SPEC_IT", p: 0.62 }],
    human: ["SPEC_IT"],
  },
};

// ── Host ─────────────────────────────────────────────────────────────────────
// Plays Superset (a session that finishes), Jev (a scored pick) and the person.
// Every loop iteration is a fresh runAgent call against the same store, as the
// short-lived host (#304) would make after being woken.

async function play(name) {
  const scenario = scenarios[name];
  const world = createWorld(scenario.world);
  const jevScript = [...(scenario.jev ?? [])];
  const humanScript = [...(scenario.human ?? [])];
  const sessions = new Map(); // idempotency key (#304: map/ticket/step) → Superset session
  const lines = []; // roughly what #304 writes as one tracker comment per transition

  const actors = {
    startSession: createAsyncLogic({
      run: async ({ input }) => {
        const key = `${input.mapId}/${input.ticket ?? "-"}/${input.step}`;
        if (!sessions.has(key)) sessions.set(key, `superset-${sessions.size + 1}`);
        lines.push(`  start ${sessions.get(key)}  ${key}`);
        return { sessionId: sessions.get(key), key };
      },
    }),
  };

  // The Jev adapter. Code owns the threshold, so a low-probability pick becomes "None".
  const executors = {
    decide: async (request) => {
      const { pick, p } = jevScript.shift() ?? { pick: "NONE_OF_THESE", p: 1 };
      const taken = p >= JEV_THRESHOLD ? pick : "NONE_OF_THESE";
      lines.push(`  jev   ${request.name}: ${pick} @ ${p} → ${taken}`);
      return { event: { type: taken } };
    },
  };

  const store = createInMemoryEventLogStore();
  const threadId = `map-297-${name}`;
  let event;
  for (let wake = 0; wake < 40; wake++) {
    const run = await runAgent(routeMachine, {
      // Input only starts a run. Every later wake resumes it from the store's log.
      ...(wake === 0 ? { input: { mapId: 297, evidence: world.evidence() } } : {}),
      actors,
      executors,
      store,
      threadId,
      event,
    });
    const snap = run.snapshot;
    lines.push(`        → ${snap.value}`);
    if (run.status === "done") break;
    if (snap.hasTag("awaiting-session")) {
      // In real life the host exits here, and the outcome hook wakes it later.
      const step = snap.value === "mapGraduateWait" ? "map-graduate" : snap.value.replace("Wait", "");
      world.apply(step, snap.context.ticket);
      event = { type: "SESSION_DONE", evidence: world.evidence() };
      lines.push(`  done  ${step}  evidence ${JSON.stringify(event.evidence)}`);
    } else if (snap.hasTag("awaiting-human")) {
      const interaction = getInteraction(snap);
      const choice = humanScript.shift() ?? "ABANDON";
      lines.push(`  wait  "${interaction.label}"`);
      lines.push(`        offers [${interaction.events.map((e) => e.type).join(" | ")}], person picks ${choice}`);
      event = { type: choice };
    } else {
      throw new Error(`idle in ${snap.value} with nothing to wake it`);
    }
  }
  const log = await store.read(threadId);
  console.log(`\n■ ${name}  (${log.length} entries in the replayable event log)`);
  console.log(lines.join("\n"));
}

console.log("lintAgentMachine:", JSON.stringify(lintAgentMachine(routeMachine)));
const which = process.argv[2] ? [process.argv[2]] : Object.keys(scenarios);
for (const name of which) await play(name);
