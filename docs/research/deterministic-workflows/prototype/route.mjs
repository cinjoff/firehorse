// Throwaway prototype for #307. The Firehorse route as a plain XState v5 machine.
//
// No model and no Superset. Every session is scripted, and so is every Jev pick.
// The point is to react to the shape: the states, where code decides, where Jev
// decides, where a person decides, and what the log says afterwards.
//
// Run: npm install && node route.mjs [happy|red-gate|fog-jev|fog-low]

import { assign, createActor, fromPromise, setup } from "xstate";

// The #305 threshold: a Jev pick below it is treated as "None of these."
const JEV_THRESHOLD = 0.8;
// A red gate re-enters build this many times before a person is asked.
const MAX_BUILD_ATTEMPTS = 2;

// ── The machine ──────────────────────────────────────────────────────────────
//
// Guards read only `context`, and `context` changes only through events. Every
// fact a guard needs (the frontier, the fog, the gate result) arrives as the
// SESSION_DONE payload, which the host gathers from the tracker and a re-run gate.
// That keeps a persisted snapshot and a replayed log in agreement with each other.
// The @statelyai/agent version of this prototype read the tracker from inside its
// guards, and resuming threw a replay divergence.

export const routeMachine = setup({
  actors: {
    // Superset: start (or find) the session for this step. Real version: `superset agents create`.
    startSession: fromPromise(async () => {
      throw new Error("provide startSession");
    }),
    // Jev: return { type, p } for one of the legal events. Real version: a Jev Choice call.
    decide: fromPromise(async () => {
      throw new Error("provide decide");
    }),
  },
  guards: {
    frontierOpen: ({ context }) => context.evidence.frontier.length > 0,
    allBlocked: ({ context }) => context.evidence.blocked > 0,
    wayClear: ({ context }) => context.evidence.fog === 0,
    gateGreen: ({ context }) => context.evidence.gate === "green",
    canRetryBuild: ({ context }) => context.buildAttempts < MAX_BUILD_ATTEMPTS,
    // The decision model proposes; code decides. A pick is taken only when
    // it is confident enough AND it is one of the events this state accepts.
    jevPicked: ({ event }, type) => event.output.type === type && event.output.p >= JEV_THRESHOLD,
  },
  actions: {
    takeEvidence: assign({ evidence: ({ event }) => event.evidence }),
    nextBuildAttempt: assign({ buildAttempts: ({ context }) => context.buildAttempts + 1 }),
  },
}).createMachine({
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
      // Code: the frontier query first, then the two ways a map can be done.
      always: [
        {
          guard: "frontierOpen",
          target: "mapSession",
          actions: assign({ ticket: ({ context }) => context.evidence.frontier[0] }),
        },
        { guard: "allBlocked", target: "mapBlocked" },
        { guard: "wayClear", target: "specSession", actions: assign({ ticket: null }) },
        // No children, but fog remains. #301 found no handoff covers this, so it
        // is a judgement: the Jev seam.
        { target: "mapFogJudgement", actions: assign({ ticket: null }) },
      ],
    },
    mapSession: session("map", "mapWait"),
    mapWait: waitFor("mapChoose"),
    mapBlocked: {
      tags: ["awaiting-human"],
      meta: { label: "Every child of the map is blocked. Unblock one, or stop." },
      on: { ABANDON: "abandoned" },
    },
    mapFogJudgement: {
      invoke: {
        src: "decide",
        input: () => ({
          name: "fogOrSpec",
          question:
            "The map has no open tickets, but its Not yet specified section still has entries. " +
            "Is any of it sharp enough to ticket now, or is the way clear enough to spec?",
          options: ["GRADUATE_FOG", "SPEC_IT", "NONE_OF_THESE"],
        }),
        onDone: [
          { guard: { type: "jevPicked", params: "GRADUATE_FOG" }, target: "mapGraduateSession" },
          { guard: { type: "jevPicked", params: "SPEC_IT" }, target: "specSession" },
          // Below the threshold, "None of these.", or anything else: a person picks.
          { target: "mapFogHuman" },
        ],
        onError: "mapFogHuman", // no Jev key, or Jev unreachable
      },
    },
    // #305: the person picks from today's ▶ Next block.
    mapFogHuman: {
      tags: ["awaiting-human"],
      meta: {
        label: "Jev was not confident. The map has no open tickets but still has fog.",
        options: {
          GRADUATE_FOG: "/firehorse:map <map> · one more decision surfaced",
          SPEC_IT: "/firehorse:spec <map> · the way is clear",
        },
      },
      on: { GRADUATE_FOG: "mapGraduateSession", SPEC_IT: "specSession" },
    },
    mapGraduateSession: session("map-graduate", "mapGraduateWait"),
    mapGraduateWait: waitFor("mapChoose"),

    // ── spec and tickets: one session each, no judgement in between.
    specSession: session("spec", "specWait"),
    specWait: waitFor("ticketsSession"),
    ticketsSession: session("tickets", "ticketsWait"),
    ticketsWait: waitFor("buildSession", "nextBuildAttempt"),

    // ── build: the host re-runs the gate after each session; a red gate may retry, then a person decides.
    buildSession: session("build", "buildWait"),
    buildWait: waitFor("gateCheck"),
    gateCheck: {
      always: [
        { guard: "gateGreen", target: "shipSession" },
        { guard: "canRetryBuild", target: "buildSession", actions: "nextBuildAttempt" },
        { target: "gateRedHuman" },
      ],
    },
    gateRedHuman: {
      tags: ["awaiting-human"],
      meta: {
        label: `The gate stayed red after ${MAX_BUILD_ATTEMPTS} build sessions.`,
        options: { RETRY_BUILD: "Run one more build session", ABANDON: "Stop the run" },
      },
      on: {
        RETRY_BUILD: { target: "buildSession", actions: "nextBuildAttempt" },
        ABANDON: "abandoned",
      },
    },

    // ── ship
    shipSession: session("ship", "shipWait"),
    shipWait: waitFor("shipped"),

    shipped: { type: "final" },
    abandoned: { type: "final" },
    failed: { type: "final" },
  },
});

// One step = start a Superset session, then wait for it to report back.
function session(step, next) {
  return {
    invoke: {
      src: "startSession",
      input: ({ context }) => ({
        step,
        ticket: context.ticket,
        mapId: context.mapId,
        attempt: context.buildAttempts,
      }),
      onDone: next,
      onError: "failed",
    },
  };
}

// Short-lived host (#304): the process may exit in any wait state. SESSION_DONE wakes it.
function waitFor(next, ...actions) {
  return {
    tags: ["awaiting-session"],
    on: {
      SESSION_DONE: { target: next, actions: ["takeEvidence", ...actions] },
      SESSION_FAILED: "failed",
    },
  };
}

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
    jev: [{ type: "GRADUATE_FOG", p: 0.91 }],
  },
  "fog-low": {
    world: { frontier: [], fog: [310], gateRuns: ["green"] },
    jev: [{ type: "SPEC_IT", p: 0.62 }],
    human: ["SPEC_IT"],
  },
};

// ── Host ─────────────────────────────────────────────────────────────────────
// Plays Superset (a session that finishes), Jev (a scored pick) and the person.
// Every wake is a fresh process in real life: restore the persisted snapshot,
// send one event, run until the next wait, persist, exit.

async function play(name) {
  const scenario = scenarios[name];
  const world = createWorld(scenario.world);
  const jevScript = [...(scenario.jev ?? [])];
  const humanScript = [...(scenario.human ?? [])];
  const sessions = new Map(); // idempotency key → Superset session
  const lines = []; // roughly what #304 writes as one tracker comment per transition

  const machine = routeMachine.provide({
    actors: {
      startSession: fromPromise(async ({ input }) => {
        // #304's key, with the attempt number (prototype finding 3).
        const key = `${input.mapId}/${input.ticket ?? "-"}/${input.step}#${input.attempt}`;
        if (!sessions.has(key)) sessions.set(key, `superset-${sessions.size + 1}`);
        lines.push(`  start ${sessions.get(key)}  ${key}`);
        return { sessionId: sessions.get(key) };
      }),
      decide: fromPromise(async ({ input }) => {
        const pick = jevScript.shift();
        if (!pick) throw new Error("no Jev key"); // → onError → the person
        lines.push(`  jev   ${input.name}: ${pick.type} @ ${pick.p}`);
        return pick;
      }),
    },
  });

  let persisted = null; // what the real host keeps between wakes (#304: rebuilt from the tracker log)
  let event = null;
  for (let wake = 0; wake < 40; wake++) {
    const actor = persisted
      ? createActor(machine, { snapshot: persisted })
      : createActor(machine, { input: { mapId: 297, evidence: world.evidence() } });
    actor.start();
    if (event) {
      // A person's pick or a session report is only sent if this state accepts it.
      if (!actor.getSnapshot().can(event)) throw new Error(`illegal ${event.type} in ${actor.getSnapshot().value}`);
      actor.send(event);
    }
    const snap = await settle(actor);
    persisted = JSON.parse(JSON.stringify(actor.getPersistedSnapshot()));
    actor.stop();
    lines.push(`        → ${snap.value}`);
    if (snap.status === "done") break;
    if (snap.hasTag("awaiting-session")) {
      // The host exits here in real life, and the outcome hook wakes it later.
      const step = snap.value === "mapGraduateWait" ? "map-graduate" : snap.value.replace("Wait", "");
      world.apply(step, snap.context.ticket);
      event = { type: "SESSION_DONE", evidence: world.evidence() };
      lines.push(`  done  ${step}  evidence ${JSON.stringify(event.evidence)}`);
    } else if (snap.hasTag("awaiting-human")) {
      const meta = Object.values(snap.getMeta())[0];
      const choice = humanScript.shift() ?? "ABANDON";
      lines.push(`  wait  "${meta.label}"`);
      lines.push(`        offers [${Object.keys(meta.options ?? {}).join(" | ")}], person picks ${choice}`);
      event = { type: choice };
    }
  }
  console.log(`\n■ ${name}`);
  console.log(lines.join("\n"));
}

// Run until the machine is waiting on a session, a person, or is done.
function settle(actor) {
  return new Promise((resolve) => {
    const check = (s) =>
      (s.status === "done" || s.hasTag("awaiting-session") || s.hasTag("awaiting-human")) && resolve(s);
    actor.subscribe(check);
    check(actor.getSnapshot());
  });
}

const which = process.argv[2] ? [process.argv[2]] : Object.keys(scenarios);
for (const name of which) await play(name);
