# TechnoDöner (formerly Berlin Bears): devlog

*Game jam 14 · started Saturday 14 November 2026 · times are Berlin time (CET)*

## The pitch

> Bombanana meets Overcooked. Bears make döners, but their surroundings get in the way: a techno party is too loud to talk, so they have to communicate some other way, with hand signs or dance moves. The goal is to finish döners for the customers. Two-player co-op on one keyboard.

The core idea is that the difficulty comes from the place, not the recipe: each venue blocks a different kind of communication, and the bears have to find another way to talk.

---

## 14 Nov, 15:06: kickoff

The pitch went into three Claude sessions at once, each taking a different route. Two quick course corrections while the first one was working:

> *"Actually it's not a shared keyboard. Can we do multiplayer cross-device, like 2 mobile phones or 2 laptops?"*

> *"Can you get it into a demo state ASAP, like in a few mins? Don't over-engineer it at this point. Finish something to show first, and then continue the larger project on the side."*

That's why the work split into a quick demo now and a full online build in a side session:

- **A quick single-file demo** with a hard 5-minute budget.
- **A playable demo** with the venues as "shifts".
- **A full build in a side session:** online co-op over the artifact `room` (host-authoritative, the guest sends inputs), touch controls for phones, three shifts and an interactive trailer.

## 15:21: quick demo v0.1, two shifts

![Quick demo v0.1 menu](devlog/02-quick-demo-v0.1.jpg)

→ [../prototypes/demo.html](../prototypes/demo.html) · published (private) at https://claude.ai/artifact/Qqw3ph2ML7roVfeFmdAo1y

- **Shift 1, Kotti Imbiss 18:00:** the basic döner line. Bread from the crate, hold chop at the spit, chop vegetables on a board, walk to a sauce bottle, serve at the window. Faster serves earn bigger tips.
- **Shift 2, Bunker Club 03:00:** too loud to talk, so **customers order by dancing**. A bear stands under the window, starts dancing and copies the customer's arrow moves to decode the ticket. A wrong move costs patience.
- Bruno (WASD, E, Q) and Bärbel (arrows, `.`/Enter, `/`/R-Shift). Synthesized music, € scoring with stars.

| Kotti Imbiss: the döner line | Bunker Club: dance-order ticket |
|---|---|
| ![Kotti Imbiss gameplay](devlog/02-kotti.jpg) | ![Bunker Club gameplay](devlog/02-bunker.jpg) |

![Bunker Club shift intro](devlog/02-bunker-intro.jpg)

## 15:24: single-file demo + trailer

![Single-file demo title screen](devlog/01-single-file-demo.jpg)

Everything in one HTML file → [devlog/01-single-file-demo.html](devlog/01-single-file-demo.html)

- **P1 Bärbel, the club bear (WASD, E, Q):** works the counter. The techno is so loud that she can only read an order bubble standing right next to the customer. **Q = dance** shows the last order she heard as glowing icons.
- **P2 Knut, the kitchen bear (arrows, Enter, `.`):** pita → hold Enter at the spit for meat → lettuce, onion, garlic sauce → slide it through the pass window. His dance shows what he's built ("this one?").
- **Bass drops:** every 25 s the lights go out for 6 s. Only spotlights, strobe flashes and the dance signals show.
- 150 s rounds, patience bars, "NEIN!" for a wrong döner, −€3 for an angry walkout. Ratings run from *"The bouncer says: NEIN"* to *"Legends of the 4 AM queue"*.
- **Interactive trailer (T):** about 39 s in 7 chapters, from Berlin at 3 AM to the title card. Clicking or any key makes the bears dance and throws döners around; in the bass-drop scene the mouse is a flashlight.

| Club side vs kitchen side | Bass drop: lights out |
|---|---|
| ![Single-file demo gameplay](devlog/01-gameplay.jpg) | ![Bass drop](devlog/01-bass-drop.jpg) |

**Trailer chapters**

| | |
|---|---|
| ![Berlin, 3 AM](devlog/01-trailer-1.jpg) | ![It's too loud](devlog/01-trailer-2.jpg) |
| ![Two bears, one keyboard](devlog/01-trailer-3.jpg) | ![Dance it](devlog/01-trailer-4.jpg) |
| ![Bass drop](devlog/01-trailer-5.jpg) | ![Title card](devlog/01-trailer-7.jpg) |

Tested by script (a full döner served, all trailer scenes render). Not played by hand yet.

## 15:27: playtest feedback → rethink

After looking at v0.1:

> "Make the UI more like Bombanana. Also there's none of that *'I'm restricted and can only do one thing, and I need someone else's help so together we can do something bigger.'*"

**This is the key design note of the day.** In v0.1 both bears could do everything, so it played as Overcooked with a dance minigame on top. The restriction has to be **on the players, not just the environment.**

Reference check: in Bombanana, each of the three monkeys is missing one sense (blind, deaf, mute), each holds one piece of the puzzle, and they talk only through gestures and an emote wheel.

## 15:31–15:42: design branch, "Mit Alles" for laptop + phone

In a separate session: *"another version … one player on laptop, one on mobile phone. We need to get a döner made. A coordination game."*

**References looked at:** The Past Within (two devices, neither sees the other's screen), Operation: Tango (agent + hacker with different information), Lethal Company (the terminal player guides teammates in the dark), and two more.

**Focus picked:** *"communicating the ingredients of the döner to the chef, affected by environmental difficulties."*

**The setup:** the phone player is at the street window and sees the order. The laptop player is at the grill and sees the bins. One knows what's wanted and only the other can build it.

**Design rule:** each difficulty corrupts one player's information, or the channel between them, and the best ones can only be fixed by the other player.

Ten difficulties, in three groups:
- **Hearing each other:** the extractor fan (the laptop really plays loud fryer noise, so you shout in real life), a passing bus, and more.
- **The customer:** a 3 AM drunk customer who keeps contradicting themselves, and a tourist who orders in emoji.
- **The kitchen:**
  - grill smoke hides the bin labels
  - mixed-up sauces, where only the phone has the true colors
  - pigeons emptying bins mid-order
  - a power cut, where the phone becomes the chef's torch

**Progression:** from Tuesday lunch (calm) up to Saturday 3 AM (everything at once).

**Tech idea:** the phone scans a QR code shown on the laptop, and a small websocket relay keeps the two in sync.

*Not built. The session offered a prototype with the fan, rain and smoke.*

## 15:36: "Berlin Bears Online" v0.2, one device per bear

![Berlin Bears Online menu](devlog/03-bears-menu.jpg)

The main session's answer to the feedback, modelled on Bombanana: each bear plays on their own device, uses a pointing glove, and nobody can hear anything. Published (private) at https://claude.ai/artifact/L31oprWLxHt1CUPs4Ue7Xy

| | **Bruno · Kasse** | **Bärbel · Grill** |
|---|---|---|
| Sees | the club crowd and the customers at the window | the kitchen wall, the spit, and Bruno through the hatch |
| Can do | copy the customer's dance to take the order, add sauce, serve | shave meat, chop veg, assemble, pass through the hatch |
| Can't | touch meat or veg, or hear anything | see any order, or hear anything |
| Talks with | paw signs | paw signs back |

![Both views side by side](devlog/03-bears-solo.jpg)

## 15:41: "Roles" split-screen version (side session)

![Roles build menu](devlog/03-roles-menu.jpg)

The side session built its own role-split version at the same time, with the roles the other way round (**Bärbel at the till, Bruno at the grill**), three shifts and a one-keyboard split screen. Published (private) at https://claude.ai/artifact/QaHHpTmm7sYsFYxeKBCwgZ · playable copy: [../prototypes/roles.html](../prototypes/roles.html)

1. **Kotti Imbiss 18:00:** Bruno faces the grill and can't see the window. Only Bärbel knows the orders, so she has to sign them to him.
2. **Bunker Club 03:00:** too loud. Customers dance their orders, Bärbel copies the dance to read the ticket, then signs it on to Bruno.
3. **U8 Nachtzug 05:00:** the tunnels go pitch black on Bruno's side, and only a torch shows one bin at a time.

![Kotti Imbiss role cards](devlog/03-roles-kotti-start.jpg)

![Kotti Imbiss split screen](devlog/03-roles-kotti.jpg)

| Bunker Club | U8 Nachtzug |
|---|---|
| ![Bunker Club split screen](devlog/03-roles-bunker.jpg) | ![U8 Nachtzug split screen](devlog/03-roles-u8.jpg) |

Tested locally with keyboard events: a full order (+€11), chopping, dance decoding, the U8 torch, and two players over the room in side-by-side iframes.

## 15:42–15:46: "How do I actually play?" → v0.3, bots + quick play

Two questions from playtesting: *"Can you make an easier way to playtest it on one device? Or quickly with two?"* and *"Wait, so how do I play the game actually?"*

v0.3 (same link as v0.2) → playable copy: [../prototypes/bears-2d.html](../prototypes/bears-2d.html)
- **Bot partners:** play either bear alone. Bot Bärbel cooks from your signs, and bot Bruno decodes dances and signs orders to you.
- **Quick play:** both devices press one button and get matched.
- **Join by QR code or link** from the phone.

![v0.3 menu](devlog/04-bears-v03-menu.jpg)

| Playing Bruno: copy the dance, then sign it | Playing Bärbel: cook from Bruno's signs |
|---|---|
| ![Bruno with bot Bärbel](devlog/04-bears-v03-bruno.jpg) | ![Bärbel with bot Bruno](devlog/04-bears-v03-baerbel.jpg) |

## 15:46: interactive trailer, 55 s

Published (private) at https://claude.ai/artifact/4GjBu3WwGJWmCVwKUCjfhc · copy: [../prototypes/trailer2d.html](../prototypes/trailer2d.html)

Eight chapters with a scrubber and mute. At chapter 4 the trailer stops and the viewer has to copy the customer's dance themselves; if nobody does, it carries on after 10 s. The end card links to the game.

| | |
|---|---|
| ![Berlin, 03:00](devlog/05-trailer-1.jpg) | ![Nobody can hear a thing](devlog/05-trailer-2.jpg) |
| ![Two roles](devlog/05-trailer-3.jpg) | ![Your turn: copy the dance](devlog/05-trailer-4.jpg) |
| ![Through the strobe](devlog/05-trailer-5.jpg) | ![Shave, chop, build](devlog/05-trailer-6.jpg) |
| ![Two phones, two views, one döner](devlog/05-trailer-7.jpg) | ![End card](devlog/05-trailer-8.jpg) |

## 15:48: "But how does the chef know what the dance means?"

**Second key design note.** In v0.2/v0.3, once Bruno copies the dance his screen shows the whole order. So the dance is just a reflex test and Bärbel only follows instructions, which isn't really Bombanana: there, one monkey sees the bomb and another has the manual, so neither can solve it alone.

Proposed fix, the **Tanzkarte**:
- Bruno sees the dance but **not what it means**. He passes the moves through the hatch.
- Bärbel has the **dance chart** on her wall (↑↑ = Fleisch, ←→ = Salat, ↓↺ = Scharf…). It changes every night so nobody can memorise it.
- **Sauces go the other way:** only Bruno can add them, but only Bärbel knows which sauce the order needs.

→ Each bear holds half of every order, and the strobe and noise make passing it over the hard part.

## 15:51: three more limitation ideas (side session)

Each one gives one bear a limit that the other has to make up for:
1. **Späti blackout:** Bärbel's kitchen goes pitch black and she can only *feel* what she grabs ("round and soft", "papery skin"). Bruno holds the only light, a phone torch through the hatch, and steers her paw with signs.
2. **Frozen spit:** too heavy to turn alone. The crank is on Bruno's side and the knife on Bärbel's, so meat only comes off when both act on the beat. They sync with nods and 3-2-1 claw countdowns.
3. **Fog machine:** fog blanks Bruno's view of the customers. Only Bärbel can run the extractor fan, but while it runs her spit stops cooking, so they have to negotiate when to clear the air.

**Bonus:** only three paw signs per order, so each pair invents its own shorthand, a secret language. That's the moment Bombanana players love most.

Then a follow-up: *"no, I mean ideas on how to do the comms"*, meaning other channels than the sign wheel:

| Channel | How it works | Trade-off |
|---|---|---|
| **Club laser pointer** | Bruno points a DJ laser through the hatch at the menu board on Bärbel's wall. Online, it's just his cursor on her screen. | Fast, but it shakes with the bass and lands between items. |
| **Drawing on the steamy hatch glass** | Bruno draws a picture on the fogged window. | Can say anything, but Bärbel sees it mirrored and it fades in seconds. "Onion" and "tomato" look alike. |
| **Knocking on the counter** | Knocks show up as phone vibration, or as a counter jolt on a laptop. The pair invents its own code. | Reaches her without her looking, but carries very little. |

**Idea:** give each shift a different channel, or let players switch between them, so the fun is in picking the right one under pressure. *(Phone vibration doesn't work on iPhone, so a screen shake has to stand in.)*

## 15:53: v0.4, early-PS2-style 3D

*"Let's make the game with three.js in early PS2-style 3D."* Same link as before (https://claude.ai/artifact/L31oprWLxHt1CUPs4Ue7Xy). Playable copy: [../prototypes/bears.html](../prototypes/bears.html). The 2D version is kept as [v0.3](../prototypes/bears-2d.html).

![Bruno's view, 3D](devlog/06-3d-bruno.jpg)

**The look:**
- three.js renders at a low 480×270, upscaled with crisp pixels.
- Low-poly smooth-shaded models, tiny blocky textures (turquoise tiles, brushed steel, wood), fog and faint CRT scanlines.
- Whatever you hover glows yellow, like in Bombanana.

**Bruno's view:** first person from the döner window into the bunker. The crowd bobs to a 128 BPM kick, lasers sweep, and a neon DÖNER sign pulses on the beat. Low-poly animal customers (fox, raccoon, boar, rabbit, pigeon) dance their orders. Bärbel holds up her sign cards in the hatch on the right.

**Bärbel's view:** first person at the counter. She has a rotating spit with a glowing heater, the bread crate, the veg bins, a board and a plate. Bruno shows in a dark hatch that strobes with the music, and the fog machine sometimes hides him completely.

![Bärbel's view, 3D](devlog/06-3d-baerbel.jpg)

| Menu | Both views side by side |
|---|---|
| ![v0.4 menu](devlog/06-3d-menu.jpg) | ![Both views](devlog/06-3d-both.jpg) |

Gameplay is unchanged from v0.3. Scripted runs against the bots served a döner (+€11) in both views. It hasn't been tried on a phone, where the 3D may run slower. The trailer session has been asked to match the new look.

## 16:03: trailer v2 in the 3D look

The same 55 s, 8-chapter interactive trailer, rebuilt with the game's own 3D models and textures and the same low-res, scanline rendering. It's republished at the same link (https://claude.ai/artifact/4GjBu3WwGJWmCVwKUCjfhc). Copy: [../prototypes/trailer.html](../prototypes/trailer.html). The 2D trailer is kept in [../prototypes/trailer2d.html](../prototypes/trailer2d.html).

| | |
|---|---|
| ![Berlin, 03:00](devlog/07-trailer3d-1.jpg) | ![Nobody can hear a thing](devlog/07-trailer3d-2.jpg) |
| ![Two roles](devlog/07-trailer3d-3.jpg) | ![Your turn: copy the dance](devlog/07-trailer3d-4.jpg) |
| ![Through the strobe](devlog/07-trailer3d-5.jpg) | ![Shave, chop, pass](devlog/07-trailer3d-6.jpg) |
| ![Two phones, two views, one döner](devlog/07-trailer3d-7.jpg) | ![End card](devlog/07-trailer3d-8.jpg) |

Every scene and the dance input were checked in the browser, but not a real-time run with sound.

## 16:12: new core mechanic: Chef + Cashier, dances copied on camera

A brief came in from a cloud session (written with you there) that changes the core mechanic:

- **Setting:** a döner window just *outside* a Berlin techno club. Bass, sirens, police and street noise mean nobody can talk.
- **The Chef** is the original owner. He knows every regular and has **a book that maps each regular's dance to their order**, but he can't see the customers.
- **The Cashier** is a newbie. He sees each regular dance and has to **copy it with his own body on camera** so the Chef can read it.
- **Tech:** MediaPipe Pose in the Cashier's browser. About 12 upper-body joint rotations are mapped onto the bear model and sent at 15–20 Hz (no video), and the Chef sees the Cashier bear perform them in the hatch.
- **Moves** are upper-body poses held for one beat (arms up, point left/right, clap, hands on head, lean), so they still read through 0.2–0.4 s of lag.
- **No gesture recognition:** the score only checks whether the döner matches the order. There's a keyboard/button fallback for the poses.

This finally gives the split that the 15:48 note asked for: the Cashier sees the dance but doesn't know what it means, and the Chef has the book but can't see the dance.

**Blocker:** artifacts on this account can't use the camera, and MediaPipe's model files can't load there either. The options were (1) buttons now, camera later, at the current link, or (2) host it on your own site with a small relay server for two-device play.

**16:13, decision: "Host on my site".** The main session is now setting it up for jommi.fi with the publish-game pipeline.

## 16:32: Chef + Cashier becomes a real project (`~/Games/berlin-bears`)

The camera version is now its own game: Vite + three.js + MediaPipe, with its own Cloudflare Worker and a Durable Object relay (one room per kitchen code, plus a Quick-play lobby). First commit is `f773f76` on main. The earlier artifact versions and the trailer source moved into the project's `prototypes/` folder.

Code: commit `f773f76`

![Camera version menu](devlog/08-cam-menu.jpg)

**The roles have swapped again**, and now it's a cashier/chef split:
- **Bärbel, the Cashier (newbie):** stands at the street window with club bass through the walls and sirens going past. Each regular loops a **three-pose dance**, two beats per pose. She copies it with her body (**Use camera**, or keys 1–6: arms up, point left, point right, clap, hands on head, lean). A small self-view shows exactly what Bruno sees. She doesn't know anyone's order.
- **Bruno, the Chef (the original owner):** has the **Stammkunden book**, 8 regulars with their dance drawn as stick figures next to their usual order. He never sees a customer, only Bärbel dancing in the dark hatch. He cooks, passes the döner through, and signs back Ja / Nein / Nochmal / Moment.

![Bärbel copies Jens' dance](devlog/08-cam-cashier.jpg)

![Bruno reads the dance from his book](devlog/08-cam-chef.jpg)

![Both seats side by side](devlog/08-cam-both.jpg)

**Tech:** the camera turns arms, head and lean into 15 numbers on the device and sends only those, about 20×/s, never video. The bot Bruno really reads that pose stream and looks it up in the book. Six unit tests pass, including one that checks a raised left arm reads as "point left" on screen. MediaPipe's first load took about 17 s.

**Not tested:** a real camera. The first real test is a laptop as Bärbel plus a phone as Bruno.

**16:34:** the first deploy attempt stopped at the type check (the tests import `node:test`, which the type checker can't resolve). The tests were taken out of the type check (they run through tsx) and the build passes again, with all 6 tests green.

**16:34: deployed** to the preview, https://berlin-bears.joakim-isoaho.workers.dev (Worker version `1664f002`, with the ROOMS and LOBBY Durable Objects). The page, Quick-play pairing and the WebSocket relay all respond. A second deploy added the `noindex, nofollow` header, so the unreleased game stays out of search engines.

## 16:35: merging with a teammate's fork, "technodoner"

*"Look at this fork of the game, https://github.com/m-abdelhakem/technodoner. Can you make another version of the game based on the combination of both of these, and deploy it?"*

The fork is **Döner Bears** by m-abdelhakem: a Cashier Bear who sees the customer and has the rule book, and a Chef Bear who has the ingredients. The cashier turns round to gesture the order.

![The fork's start page (1:1 port)](devlog/09-original-start.jpg)

The result is **three versions on one Worker**. They're built and tested locally but not deployed yet. Code: commit `2c7df25`.

| Address | What it is |
|---|---|
| `/` | Berlin Bears (Chef/Cashier + camera), unchanged apart from a QR code |
| `/technodoner` | **TechnoDöner**: the fork's puzzle on our engine |
| `/original/` | **TechnoDoner 1:1**: the fork's own pages and rules. Its Node server became a Durable Object, and `?room=name` gives separate games. |

### TechnoDöner, the combination

![TechnoDöner menu](devlog/09-td-menu.jpg)

- **Bärbel (Cashier)** sees the customer and **the rule book**: start with the base order, then apply every rule that matches the customer's look (sunglasses → +1 meat, glitter on face → no tomato, bucket hat → +2 onion, red wristband → no lettuce, swaying drunk → +1 bread, neon outfit → +1 onion).
- To sign, she has to **turn to the kitchen**, and then she can't see the customer or the book. She signs one pose per portion, on camera or with Q W E R T, then points for **Serve!**
- **Bruno (Chef)** turns between the window (to watch her) and the table (to cook). He can't do both at once, and can answer "got it" or "repeat that".
- **Strobes** black out the window now and then. After each serve, a breakdown shows which rules applied, what was expected and what was made.
- **From Berlin Bears:** the PS2 look, Quick play, codes, `?k=` links, QR codes and bot playtesting in either seat.
- **Test:** bot vs bot served 5 out of 5 correctly, including triple-onion orders.

| Bärbel at the club counter, rule book open | Bruno at the table |
|---|---|
| ![Cashier view](devlog/09-td-cashier.jpg) | ![Chef view](devlog/09-td-chef.jpg) |

![Both seats side by side](devlog/09-td-both.jpg)

**Credit:** the fork is credited in `docs/CREDITS.md` and on the 1:1 page. The fork declares MIT only in its package.json and has no licence file, so ask the author before any public release.

## 16:48: first real playtest (PS2 version) 🎉

> "Okay, we did a playtest with the PS2 version, and it's pretty good."

**Feedback, for all versions:**
- Fix bugs
- Serve the food via the camera too: once the food is handed over, move your hand to the right spot to give the döner to the customer
- Difficulty levels: longer dances, etc.
- **Add music!!**
- Clearly show the shift timer and each customer's timer, or visual cues when a customer is 1 min, 30 s from leaving…
- **Open question:** how does the camera player tell the chef that a customer is about to leave?

**Proposed answers (main session):**
- **Impatience lives in the world, not in a number:**
  - 60 s: foot tapping, checking their phone, yellow ring.
  - 30 s: arms crossed, head shaking, red ring, tick-tick.
  - 10 s: half-turned toward the dance floor, flashing ring.
- **New body sign: "Hurry!"** Tap your wrist like a watch. The chef reads it like any other pose.
- **The chef gets one faint hint of his own:** below 30 s the customer bangs on the counter and the hatch rattles. He senses that someone is angry, but only the cashier knows how long is left.
- **Serving with the camera:** a paw follows your real wrist. Hold it on the customer's hands for 0.5 s to serve.
- **Difficulty:**
  - **Chill:** 2-pose dances, slower music.
  - **Normal:** as now.
  - **Rave:** 4-pose dances at one beat each, a second customer in the queue, look-alike regulars. In TechnoDöner, Rave also adds more rules and strobes.
- **Music:** a real building techno track, muffled through the walls in Berlin Bears and loud in the club in TechnoDöner, rising in the last minute.
- **Timers:** a big shift clock, a patience ring per customer, and the 60/30/10 s cues.
- **Bugs:** waiting for the list from the playtest.

The three versions were committed as `2c7df25` before this round.

**16:50: go-ahead:** *"build to all of them"*. The main session is now building the playtest list into the versions.

## 16:57: the whole game is renamed **TechnoDöner**

*"Change the name of all the game to TechnoDöner."* The fork's name wins: every version (the Chef/Cashier camera game, the combination, and the 1:1 port) now goes under TechnoDöner. Earlier entries keep the name Berlin Bears, as it was called then.

## ~17:00: playtest round built + deployed (`b9e572d`)

Built in about 5 minutes on request (*"let's get this done in the next 5 minutes"*).

The versions now have names:

| | **TechnoDöner · Regulars** (`/`) | **TechnoDöner · Rule Book** (`/technodoner`) | **TechnoDöner · Original** (`/original/`) |
|---|---|---|---|
| Where | outside the club: muffled bass, sirens | inside the club | inside the club |
| Puzzle | each regular always orders the same thing; their dance says who they are | the customer's look + a rule book modify a base döner | same as Rule Book |
| Bärbel knows | the dance, **not** the order | the customer **and** the rule book | same |
| Bruno knows | **his book** (dance → order) | nothing, only her signs | same |
| Bärbel talks by | copying the dance with her body | one pose per portion, then "Serve!" | gesture buttons |
| In one line | memory and recognition | logic and counting | the fork as its author made it |

**What the playtest round added** (Regulars + Rule Book):
- **Difficulty:** Chill / Normal / Rave. Regulars: 2, 3 or 4-pose dances. Rule Book: 3, 6 or 8 rules plus faster strobes.
- **Music:** a real techno track (intro → groove → breakdown → peak) that follows the difficulty's tempo and builds in the last minute. It's muffled through the wall in Regulars and open in Rule Book. M mutes.
- **Timers:** a shift clock, a patience ring per customer, and 60/30/10 s ticks while the customer taps a foot, crosses their arms, then turns away.
- **Hurry!:** tap your wrist on camera (or press 7 / D). Bruno sees no timer, but below 30 s he hears BANGs on the counter and his view rattles.
- **Serving by hand:** hold your camera hand over the tray, sill or customer for 0.5 s.
- **Bugs fixed:** Rule Book was scoring a phantom customer on every frame. Bruno can no longer serve an empty plate. Portrait phones get a "turn sideways" hint.

| Regulars: Bärbel copies Jens' dance (patience ring, Hurry! key) | Regulars: Bruno + his Stammkunden book |
|---|---|
| ![Regulars cashier](devlog/10-regulars-cashier.jpg) | ![Regulars chef](devlog/10-regulars-chef.jpg) |
| ![Rule Book cashier](devlog/10-rulebook-cashier.jpg) | ![Rule Book chef](devlog/10-rulebook-chef.jpg) |
| Rule Book: Bärbel with the rule book | Rule Book: Bruno at the table |

| Regulars menu (difficulty) | Rule Book menu |
|---|---|
| ![Regulars menu](devlog/10-regulars-menu.jpg) | ![Rule Book menu](devlog/10-rulebook-menu.jpg) |

**Deployed** to all three addresses. The Original went out mid-edit from a subagent and needs one more deploy. **Still running:** the Original's update and **two TikTok promos**.

## 17:02: direction: "the gameplay should be the same as Regulars in all of them, using the video"

The camera dance-copying from Regulars becomes the core of every version.

**17:03:** *"it needs to be louder"*: the music, presumably (sent mid-turn).

## 17:06: one game loop everywhere: Regulars + **Club** (`77783ec`)

- **Rule Book is gone.** `/technodoner` is now **TechnoDöner · Club**: the same Regulars game (dance → copy on camera → Chef's book), set **inside** the club. It has a dance floor with a bobbing crowd, a DJ booth, lasers and full-volume music, plus its own rooms and Quick-play lobby. The trait/rule-book code was removed.
- **Louder:** the volume went up, with a compressor so it doesn't distort. The kick and bass hit harder, and the "through the wall" muffling in Regulars is much lighter.
- **Original** (`/original/`): its subagent is moving it to the Regulars loop too, while keeping the fork's own look and server.
- Tested locally: the Club renders, a regular dances, the bot Chef decodes it and serves (+€11). **Committed as `77783ec`.** **17:12: deployed.** Regulars (`/`) and Club (`/technodoner`) are live. The Original still has the half-finished files until its subagent is done.
- **Passing food by hand (camera)** works in both Regulars and Club. A big paw follows whichever wrist is raised higher. Hold it in the dashed green box over the **tray** for 0.5 s (a ring fills up) to take the döner, then in the box around the **regular** to serve.

| Club: Bärbel copies Svetlana's dance | Club: Bruno reads it from the book |
|---|---|
| ![Club cashier](devlog/11-club-cashier.jpg) | ![Club chef](devlog/11-club-chef.jpg) |

![Club menu](devlog/11-club-menu.jpg)

## 17:22: camera note: no moves with hands in front of the body

> *"We should avoid the moves that require hands in front of the body. So also for picking up and giving the döner."*

Done in all three versions (`ffc49ef`, **deployed 17:26**, along with the Original's switch to the Regulars loop):
- **Clap → Flex:** arms out to the sides, forearms straight up. The dances and the Chef's book redraw automatically.
- **Hurry! → one arm straight up, waving.**
- **Take** the döner: hand **out to the right edge**, towards the kitchen hatch, for 0.5 s. **Give** it: **lift your hand above your head**, handing it up to the customer.
- Arms up, point left/right, hands on head and lean were already outside the body.
- **Watch in the playtest:** while you're holding a döner, the "arms up" dance pose also lands in the give zone.

**Also landed:** the **Original** now plays the Regulars loop in the fork's own look, with louder music (`f7ae481`).

| Original: start | Original: Cashier Bear | Original: Chef Bear |
|---|---|---|
| ![Original start](devlog/13-original-start.jpg) | ![Original cashier](devlog/13-original-cashier.jpg) | ![Original chef](devlog/13-original-chef.jpg) |

*(Screenshots from the live site, in a separate room so no real game was disturbed.)*

## 17:31: two TikTok promos

Both are 23 s, vertical 1080×1920, with music and captions placed clear of TikTok's buttons. Both end on *"TechnoDöner · 2 players · 2 phones · play free in your browser"* + the URL. The MP4s are build output (git-ignored); re-render after art changes with `cd ~/Games/berlin-bears/promo && node render.mjs`.

**1. "POV: you work the döner window at a Berlin techno club"** → [../promo/out/promo-1.mp4](../promo/out/promo-1.mp4)

![Promo 1 frames](devlog/12-promo1-strip.jpg)

Mia dances (with the new Flex pose) → "it's too loud to talk" → Bärbel and a player silhouette copy her with their bodies → Bruno squints at the strobing hatch and finds Mia in his book → cook montage → PERFECT. Then the fail beat: a boar with crossed arms, BANG, "ABOUT TO LEAVE!", and the drop into the end card.

**2. "Can you decode this order? 🥙"** → [../promo/out/promo-2.mp4](../promo/out/promo-2.mp4)

![Promo 2 frames](devlog/12-promo2-strip.jpg)

Tarek dances, and Bruno's book flashes four similar routines → 3-2-1 *"comment your answer 👇"* → "IT'S TAREK → MIT ALLES!" as the döner stacks up → *"now do it with your body 💃"* → copy, cook, PERFECT.

**Before posting:** listen to them first (the audio was only measured, not heard). The bears' white aprons look like blank signs at low resolution, the Hurry! wave is a still pose, and the sauce portions read as thin stripes. The promo source is committed as `a48e2bb`. The rendered MP4s stay out of git. Not posted.

## 17:45: playtest feedback: hand-over is still too hard

> *"We need to improve the hand tracking and the gameplay around moving the finished döner to the customer. It's still too hard. Let's add more flashing player instructions. Think of it like a party game like Jackbox. It should always be clear what's happening and what to do."*

**Design direction:** Jackbox-style clarity. Big, flashing step-by-step prompts, so nobody is ever unsure what to do next.

---

## Open questions

- Is one keyboard enough for asymmetric roles, or does this need two screens (online or phones) so each bear really can't see what the other sees?
- How rich should the paw-sign vocabulary be? A fixed emote wheel like Bombanana, or freeform dance moves?
- Which role split wins: Bruno at the till (v0.2/v0.3) or Bärbel at the till (Roles)?
- Nobody has played any build by hand yet. Difficulty and feel are untuned.

## Next

- [ ] Play the Roles build with two people and write down what works
- [x] Trailer in the 3D look
- [ ] First real camera test: laptop as Bärbel, phone as Bruno
- [x] Deploy to the preview at berlin-bears.joakim-isoaho.workers.dev
- [x] Decide on the comms → body-copied dances + the Chef's book (16:12)
- [x] Deploy the three versions
- [ ] Ask m-abdelhakem about the licence before a public release
- [x] Promo videos (2 TikToks) → listen, then post
- [ ] Trailer cut for the presentation
