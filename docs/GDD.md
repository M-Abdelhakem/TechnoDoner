# Berlin Bears: design

## Pitch
A döner window just outside a Berlin techno club. Bass through the walls, sirens and police on the street: nobody can
hear a word. Two bears, two devices, and neither can do the job alone.

## Roles
- **Bärbel, Cashier (the newbie).** Sees each regular step up and dance their routine. Doesn't know what anyone orders.
  Copies the dance with her own body on camera (or keys 1–6), and hands over whatever the chef passes.
- **Bruno, Chef (the OG owner).** Has the book: every regular's dance and their usual. Can't see the customers, only
  Bärbel dancing in the dark hatch. Decodes, cooks (bread, spit, chopped veg, sauce), passes it through. Can sign back
  (Ja / Nein / Nochmal / Moment).

## Rules
- A routine is three poses held two beats each at 120 BPM, then a rest beat, looped while the regular waits.
- Poses: arms up, point left, point right, clap, hands on head, lean. Chosen to read through 0.2–0.4 s of lag and with
  only the upper body in frame.
- Scoring only checks the döner against the regular's usual: +€8 and up to €4 tip for patience left, −€3 wrong, −€5
  when a regular gives up. Three-minute shift, stars at €25 / 50 / 80.
- No gesture recognition decides anything: the relay carries the pose, and the chef reads it.

## Open questions
- Camera play needs a real playtest: are the poses readable on the bear at hatch size? Is two beats per pose right?
- More regulars per shift as the book grows; a second shift with a different street hazard.
