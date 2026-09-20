# The concepts, and where each comes from

Seventeen named ideas from the interview. Each entry gives the source, the
failure it prevents, and the framing to use when teaching it. Summarised from the
published interview; names corrected by hand, since the auto-captions garble
almost every proper noun.

## The frame

### Tactical vs strategic programming
**John Ousterhout,** *A Philosophy of Software Design.* Tactical is syntax and the
immediate change; strategic is how the system holds together over time. Pocock's
claim is that AI has largely eaten the tactical half, which raises rather than
lowers the value of the other half, because you now apply it at higher leverage.
He describes his own career move from TypeScript teaching to this layer in the
same terms.

### The mixing desk
**Pocock's image** for why strategic skill is hard to learn. Picture a desk of
sliders: how many deployable units, how much abstraction, how much coupling. Push
one and you get microservices, pull it and you get a monolith. The problem is the
feedback loop. You cannot hear what is wrong until much later, when the mistakes
catch up with you. His argument is that AI shortens that loop, because moving
faster makes strategic mistakes arrive sooner.

### Knowledge vs wisdom
Two layers in teaching: the what, and the why. Knowledge got cheap to acquire.
Wisdom did not, and you still hit the same problems you would have hit without
it.

### Leading words
**Pocock's coinage,** and the load-bearing claim for everything else. Repeat a
term from the literature a couple of times in a prompt or a skill and the agent
starts using it in its own reasoning traces, and behaves accordingly. The
mechanism he gives is that the books are decades old, so the vocabulary sits in
the model's prior. This is why a guide built on old books is technique rather
than nostalgia.

## Working with the model

### The communication gap
However capable the model, it cannot read your mind, and Pocock argues this is the
most underestimated thing about agents. Closing the gap is not only about
implementation detail: it is about transmitting scope, priorities, and your
hierarchy of values. He frames grilling as the agent getting to know you.

### Smart zone and dumb zone
**Credited to Dex Horthy.** Every token competes for attention, and the more
voices in the room the harder it is to hear the important ones. Part of the
context window is better than the rest, roughly the first 150k tokens, and he is
explicit that this holds regardless of the window's advertised size.

### Ralph loops
**Credited to Jeffrey Huntley.** Give the loop a goal, make the smallest change
that moves toward it, then clear the context. Designed to stay inside the smart
zone. State lives in the filesystem and the environment, not in the model, so
each turn starts fresh without starting over.

### Momento-driven development
The agent wakes with no memory every session, so you are optimising the codebase
for a permanent new starter. A human survives a bad codebase by building up
memory of where the problems are. An agent cannot, so everything confusing stays
confusing forever. Two consequences he draws: your code is the environment the
agent operates in, and you are your agents' platform team.

## Planning

### Spec as destination document
A document that declares when you have arrived. He used to call it a PRD. It is
broken into tickets sized to one session, and one spec can span 30 to 40 of them.
Note the distinction he does not draw explicitly: this is a destination, not an
editable source you regenerate code from. See `decision-rules.md` on
spec-driven development.

### The map and the fog of war
Planning itself exceeds one context window, so it is split across sessions around
a shared artifact. A map holds the destination and the decisions known to be
needed, as milestones. Each grilling session opens more of the map, the way fog
lifts as you move. Ticket types he names: grilling, prototype, research, and
ordinary work such as provisioning infrastructure. This is the structure
`wayfinder` implements.

### Day shift, night shift
Plan while you are awake, let agents run unattended. His motive is avoiding
context switching between many terminals.

## Building

### Tracer bullets
***The Pragmatic Programmer.*** Get feedback quickly on the work by building
something that runs end to end early. The agent failure he observed: build the
entire database layer, then the entire application layer, then a component
library, and only wire them together at the end, which is when the shapes turn
out not to match.

### Vertical slices
The corrective. Rather than horizontal slices that finish one layer at a time, cut
a narrow path through every layer so feedback arrives immediately.

### Deep modules
**Ousterhout,** named as a mined leading word and not defined in the interview. A
simple interface over a substantial implementation, which means less has to be in
context for the agent to use it correctly.

### Ubiquitous language
**Eric Evans,** *Domain-Driven Design.* He recommends roughly the first three
chapters and says he is not a fan of the code-encoding half. Two payoffs with
agents: a precise term replaces several sentences of explanation in every later
prompt, and if the term is in the code the agent can navigate by grep. His worked
example is a term he coined for a cascade in which materialising one record forces
its ancestors to materialise too. He notes agents are good at coining these, so
ask.

## Maintaining

### Software entropy
***The Pragmatic Programmer.*** Inevitable, and his observation is that agents
produce it faster than anything before, because they cannot think strategically.
He cites **Jared Friedman** for the corollary that you can now accumulate serious
tech debt in a tiny codebase, which used to require years and a team.

### Gardening
Prompted by a remark about lint suppressions spreading like ivy. The garden
suffers entropy on its own, and noticing it early, before it is a problem, is the
skill he says matters.
