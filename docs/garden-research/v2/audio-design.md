# The sound of My Garden

Original composition: **A Little More Green**, 76 BPM, 4/4, 32 bars (101.05 seconds). A written 16-bar melody returns with an answering phrase in the second half. Warm extended chords, a round bass, soft mallets and a lightly plucked harp leave space around the player. Dark mode lowers the melody and harp; the first harvest adds occasional upper bells in daylight. Progress never makes the music faster or louder.

These are intentionally synthesized instruments and nature sounds, authored in `app/src/lib/garden/audio.ts`. They use no sampled songs, recordings, voices, external generation requests, remote services or licensed-library dependencies. The live score schedules continuously across its repeat boundary. The exported 105-second listening previews include a fade-out for standalone playback; the game does not restart an audio file every few seconds.

## Audio matrix

| Sound | Actual trigger | Sound design | Duration / repetition | Volume group |
| --- | --- | --- | --- | --- |
| Garden theme | Audio enabled during entered play | Mallet melody, harp answers, warm chord bed and bass | Continuous 32-bar score; evening and harvested-garden arrangements | Music |
| Garden breeze | Enter/resume with audio | Low-pass air with a slow swell | One continuous noise source; paused with the game | Nature ambience |
| Distant birds | Spaced daytime score intervals | Three quiet, rising chirps, softly panned | About 0.45 seconds, once per 28.4 seconds; absent at night | Nature ambience |
| Plant | Seed successfully planted | Soft earth pat, small wooden note, a harp lift | 0.7 seconds; five rustle-rate variants | Sound effects |
| Water / refill | Successful watering / well refill | Filtered trickle and uneven droplets | 0.7 / 1.1 seconds | Sound effects |
| Harvest | Flower enters basket | Leaf pull and a rising three-note harp figure | 1.3 seconds | Sound effects |
| Forage | A find collected | Light leaf flick and two rounded notes | 0.75 seconds | Sound effects |
| Discover | First landmark visit | A spacious, ascending bell figure | 2.1 seconds | Sound effects |
| Dash | Dash starts | A brief brush of air | 0.25 seconds | Sound effects |
| Butterfly start / stop | Trail starts / greeting succeeds | Airy bells, small intervals, clear progression | 1.0 / 1.25 seconds | Sound effects |
| Butterfly retry | Trail fails | Gentle two-note descent | 1.2 seconds; never an alarm | Sound effects |
| Expedition / butterfly success | Delivery / trail win | Six-note rising harp flourish | 2.6 seconds | Sound effects |
| Buddy welcome | Enter or enable audio with account Buddy enabled | Recognizable G–A–D mallet greeting | 1.0 seconds | Sound effects |
| Menu / confirm / leave | Pause, resume, exit | Three short wood/mallet tones | 0.2–0.3 seconds; pause/exit fade promptly | Sound effects |
| Need water / incomplete basket / still growing | Unavailable action feedback | Quiet neutral low note, with matching text | 0.25 seconds, 1.5-second cooldown | Sound effects |

## Player control and browser behavior

Audio starts off. A real click/tap on the sound control, or entering with a previously saved opt-in, creates and resumes the audio context. Merely loading the garden never does. The garden settings expose an overall switch and separate music, effects and nature sliders; zero mutes a layer. Values persist on the device, so one device does not unexpectedly change another device's sound. Existing device preferences migrate with sensible volume defaults.

Pause, exit, a hidden page and lost window focus fade and suspend audio. Resuming preserves the score position, reuses one context and one ambience source, and resumes only from the player's action. Account/day replacement disposes the old context. A suspended scheduler never emits a backlog of notes after a slow frame. Repeated unavailable actions are rate-limited. No voice is required to understand Buddy, and no offscreen reminder plays audio.

Implementation follows [MDN's Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) for gesture unlock, audio parameters and player controls, plus [AudioContext suspension](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend) for pause and device resource use.

## Review evidence

`app/scripts/verify-garden-audio.mjs` renders the actual instruments to stereo 44.1 kHz WAV, checks finite samples/headroom and complete mute, and checks real browser context creation, suspension, repeated resume, mute/resume races and disposal. `verify-garden-adventure.mjs audio` checks real phone-sized game controls, music scheduling, planting/watering, sliders and saved settings.

The listening preview is under `artifacts/garden-v2/audio-2/`. Signal and lifecycle checks are automated; the current agent runtime cannot listen to audio input, so subjective listening approval is not claimed. Physical iPhone/Safari and Android speaker/headphone checks remain distinct from Chrome touch emulation.
