# The look and the shot list (step 4)

SL8 wording. Restated from the vendor's found-footage story pack (research
`everygen/foundfootagestories-179c12`, prompts "The camera never sees itself", the five camera blocks,
"Fixed versus moving camera rule", "Night rules", "No text in the picture", "Timestamp readout format",
"Realism rules", "Shot list rules", "Reusable lines", "Planned length rule"; fine points #15, #41-#61),
its animal variant (`everygen/animalclips-e048e4#11`, `#13`) and the same vendor's CCTV tests
(`everygen/cctv-e02220#16`, `#17`, `#37`, `#46`, `#47`, `#53`). The camera blocks themselves are rows
of [prompts.json](prompts.json). Nothing here has run on this machine.

## Contents
- [Which camera](#which-camera)
- [The camera is never in the picture](#the-camera-is-never-in-the-picture)
- [Fixed and moving cameras](#fixed-and-moving-cameras)
- [Night](#night)
- [No lettering, and the timestamp](#no-lettering-and-the-timestamp)
- [Realism](#realism)
- [The reusable lines](#the-reusable-lines)
- [The shot list](#the-shot-list)
- [shotlist.json](#shotlistjson)

## Which camera

Decide from the request; never ask.

| The request mentions | Camera |
|---|---|
| porch, parcel, front door, doorbell | doorbell |
| shop, car park, back garden camera, CCTV | CCTV |
| what a police officer, firefighter or rescuer saw | bodycam |
| car, road, crash | dashcam |
| woods, wildlife after dark, a trail | trail camera |
| an animal story with no camera | whichever camera its setting implies |

No camera brand or product name goes into any prompt, even if the customer typed one. Keep one camera
quality across the story: the blocks describe a current home or security camera, so a grainy tape
look never sits beside a crisp one (`cctv-e02220#37`).

## The camera is never in the picture

The camera is where the viewer stands, not a thing inside the scene, and it can never see its own
mount. Write it as the qualities of its footage (smeared wide lens, flat contrast, a jerky low frame
rate), never as hardware sitting somewhere. Wherever a camera block goes (in the place picture, or in a
shot picture made without one), close it with the `own-view` row; all other pictures include the
`no-device` row when they count what is in frame.

Each frame has a single viewpoint: no looking around corners, and no view through a doorway into a
second room with readable detail. A beat set somewhere else gets its own fixed camera in the shot
list, or the narration tells it.

## Fixed and moving cameras

Doorbell, CCTV and trail cameras are bolted down: within a clip they do not pan, zoom, track or jump
to a new angle. Shots vary by the subject's distance (far, middle, just under the lens) and by what
changed in the scene. Bodycams and dashcams travel with the person or the vehicle, and their movement
is never smooth.

## Night

- **Fixed camera after dark:** infrared mode. Everything in frame, subject included, is greyscale;
  nothing keeps a colour. Near things shine, the far background goes black, eyes flare. In a night
  clip, describe each subject and object only by how light or dark it is ("dark patch across the eyes,
  light rings on the tail"). The vendor found a colour named in a night clip gets painted back: a red
  door in the prompt returned two of its three night clips to colour. A night shot is the day place
  picture switched to infrared.
- **Bodycam or dashcam after dark:** keeps its colour and never switches to infrared; the frame is
  dark apart from the headlights or a single torch, and the sky is black.
- Each clip has a single lighting state. Going from day to night happens at a cut, never inside a clip.

## No lettering, and the timestamp

Generative models spell badly, so no prompt asks for writing of any sort: no clock, date, red record
dot, app chrome, logo, watermark or subtitle. Objects that usually carry print are kept blank: an
unmarked mat, plain cardboard boxes, uniforms without names or patches, cars without badges or legible
plates, no house numbers, no shop signs. Each place and shot picture prompt finishes with the `no-text`
row. Captions come after the stitch, built from the narration, and the stitch draws the camera clock
itself (step 14); the video model never draws it.

**The readout.** A short capitalised camera label followed by the time, chosen from where and when
the story happens. Examples: doorbell `FRONT DOOR 02:51 AM`, CCTV `CAM 03 10:22 PM`, trail camera
`TRAIL CAM 06:05 AM`, dashcam or bodycam a full date and time such as `2025-03-09 22:41:17`. One
readout for the whole video; when the story switches to another camera, that camera's shots carry its
own readout. Put the time a few minutes ahead of the turn, so the payoff falls "at" that hour.

## Realism

Describe what should be there rather than listing what should not: whatever a "do not" list names can
sneak into the picture. The templates in [prompts.json](prompts.json) already hold these rules, so add nothing
to them; the rules guide what goes into their slots.

- **Framing:** never posed or centred; the subject sits off to one side and the frame edge crops part
  of it. A subject enters from a side edge, moving along the ground, or is in frame from the first
  instant; arriving from the top of the frame or over an obstacle looks like a teleport
  (`cctv-e02220#47`).
- **Light:** the dull light that location really has (grey sky, a bare porch bulb, office tubes,
  infrared). Never sunset warmth, edge lighting or a soft glow.
- **Surface:** soft with compression, grain in the dark areas, smear on anything moving. Never crisp
  across the whole frame.
- **Motion:** at true speed, a little jerky, heavy, in contact with the floor. Never slowed down,
  never weightless. Moving legs and arms tend to warp, so let the payoff rest on a near-still pose,
  make any walk short, unhurried, seen from the side at middle distance, and never let the payoff rely
  on footfalls, tracks or prints (`cctv-e02220#17`).
- **The world:** used and a bit worn, with marks on the floor, a mat knocked askew, leaves on a step;
  never tidy like a set.
- **Story objects look ordinary:** the important parcel is the size and in the spot any parcel would
  be. The words give it weight; the picture does not.
- **One moving body:** count the things in a shot that move independently and keep it to one; treat a
  pile or a stack as a single object (`cctv-e02220#46`).
- **Pin the outcome:** a model slides toward the usual action (someone at a glass door simply opens
  it). Make the odd situation physical, remove the easy way out, and state the result along with what
  does not happen ("the gate stays shut") (`cctv-e02220#16`).
- **Animals:** a plain, a little untidy animal, sized right against the step, door or person; the
  right legs, a single tail and head; the gait its species really has (dogs trot, cats creep, raccoons
  shuffle); dull fur with dirt in it; real eyes. It behaves as an animal that has no idea a camera is
  there. Only the animals the story needs, all there from the first frame, and say how many ("one fox,
  and no other animal").
- **People:** roles only, never real or famous faces; everyday clothes; hands drawn right. For a
  doorbell shot, whoever stands at the door is close below the lens and seen from overhead, looking down at the step
  or the parcel, never lifting a face to the camera (the video route may reject it). When a shot
  should have nobody in it, write that plainly ("just the cat; no person anywhere").

## The reusable lines

Write each line once in `shotlist.json` and paste it unchanged into every prompt that needs it.

| Line | What it holds |
|---|---|
| Subject | What kind of animal or which role, size, coat or clothes colours, three markers you can see, any collar or kit; under 100 characters; one per main subject, at most three. Kit is on from shot 1, or a shot shows it being put on; it never turns up between shots. A bodycam wearer or a dashcam driver is never seen and has no line. |
| Place | Three items really visible to this camera, each with its spot in the frame, and one of those set at a frame edge nobody walks to (a doorbell example: a plain mat across the foot of the frame, a post at the left edge, a hedge gate halfway up the frame beyond the steps; never the door the camera hangs on). No colour words (write "the garage door", not "the blue garage door"), because the line is pasted into all clips and night footage would paint the colour back. These three are the keep items and never move. |
| Sound | The location's own soft background noise, in a few words (far-off cars and a breeze; a fridge hum; rain on a canopy). It sits under the narrator in all of that place's clips. Keep it thin, far away, mono and narrow, never like a studio recording (`cctv-e02220#53`); the clip template already ends with no music. |
| Second camera | Its own Place and Sound lines; each shot uses the lines of its own camera. |
| Story object | Its look, and its state shot by shot. It stays where it was last left until a shot moves it. A fixed object (a gate) counts as one of the three Place items, opened halfway at most, and a shot prompt states only its state. No colour word if any shot is at night. |

## The shot list

Plan 4-6 shots (roughly 4 for a 30 s story, 5 for 35-40 s, 6 for 45 s), each 5-10 s, each a single
action at a single place and moment.

- **The first shot is the hook:** the most striking moment, in progress from the first frame, its subject
  already on screen. No empty scene-setter before it.
- **Each shot matches its words:** it shows what the narration over it says and nothing more, so a
  later reveal never appears ahead of time.
- **Neighbouring shots differ twice or more:** in subject distance, action, who is visible, the story
  object's state, or the light.
- **Move between situations:** a story of 30 s or longer needs three distinct situations or more (say
  the quiet step, the fox by the parcel, then the parcel missing and a neighbour staring), not a single
  scene shown from several distances.
- **Key moments get two shots:** for a grab, a rescue or a reunion, show the approach then the
  contact, or the contact then what comes after.
- **Planned length:** a shot's word count over 3, rounded up, held within 5-10 s; step 7 swaps it for
  the measured window.
- **Home-base variant:** one shot per sentence; the opening shot has the animal filling the frame and
  the closing shot has its face right under the lens; every shot but two at most is at the home base,
  and those two share one other location, normally the vet's; subdued light, never sunny.

## shotlist.json

`work/<p>/shotlist.json` is the plan every later step reads; `footage.py plan`, `fit`, `sound` and
`stitch` use these fields:

```json
{"aspect": "9:16", "variant": "base", "clip_route": "seedance",
 "cameras": [{"id": "porch", "kind": "doorbell", "moving": false, "tier": "modern",
              "place": "a plain mat across the foot of the frame, a post at the left edge, a hedge gate halfway up beyond the steps",
              "sound": "far-off cars and a breeze", "readout": "FRONT DOOR 02:51 AM"}],
 "subjects": [{"id": "dog", "line": "a scruffy mid-size dog, grey muzzle, one torn ear, a frayed collar"}],
 "story_object": {"line": "a plain cardboard box"},
 "shots": [{"n": 1, "camera": "porch", "light": "night", "situation": "the dog at the gate",
            "distance": "mid", "action": "nosing the gate", "subjects": ["dog"], "object_state": "on the mat",
            "words": 16, "sentences": [1, 2], "route": "seedance",
            "picture": "artifacts/<p>/pictures/shot-1.png", "clip": "artifacts/<p>/clips/clip-1.mp4",
            "clip_prompt": "…", "calm": null}]}
```

`variant` is `base` or `home-base`; `route` per shot is `seedance`, `kling` or `minimax` (a redo may
move one shot); `calm` overrides the word test `footage.py sound` applies to `clip_prompt`.
