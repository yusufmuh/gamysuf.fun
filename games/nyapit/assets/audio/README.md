# Audio release

- `bpedia-bgm.wav` is the local Bpedia acoustic-pop arrangement previously
  rendered for the same brand. It is a 48-second offline loop with no sampled
  commercial song. Its instrument bank attribution is in
  `GeneralUser-LICENSE.txt`.
- `slogan-*.wav` are static Indonesian TTS renders using
  `id-ID-GadisNeural`. The exact public and phonetic scripts are recorded in
  `voice-script.json`.
- The game performs no network audio requests. It decodes these local files
  with Web Audio, ducks the BGM under speech, and routes the master signal
  through a dynamics compressor.

To regenerate the six voice lines, run `python scripts/generate-voice.py` while
online. The finished game remains fully offline.
