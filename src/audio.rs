//! Ambient music and the secret track, with fades (port of `ambientMusic.ts`).
//!
//! A dedicated thread owns the audio device. It only exists while something plays:
//! fifteen seconds after the music is paused, the device and decoders are released.

use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player};
use std::io::Cursor;
use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

static AMBIENT: &[u8] = include_bytes!("../assets/audio/koi-ambient.mp3");
static EASTER: &[u8] = include_bytes!("../assets/audio/koi-easter.mp3");

const FADE: Duration = Duration::from_millis(1200);
const PAUSE_FADE: Duration = Duration::from_millis(300);
const TICK: Duration = Duration::from_millis(25);
/// Paused this long, the device is closed and the decoders dropped.
const RELEASE_AFTER: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Track {
    Ambient,
    Easter,
}

impl Track {
    fn index(self) -> usize {
        self as usize
    }

    fn data(self) -> &'static [u8] {
        match self {
            Track::Ambient => AMBIENT,
            Track::Easter => EASTER,
        }
    }

    fn volume(self) -> f32 {
        match self {
            Track::Ambient => 0.35,
            Track::Easter => 0.40,
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum Command {
    /// Fade this track in; any other track stops at once.
    Play(Track),
    /// Fade this track in while the current one fades out.
    Crossfade(Track),
    /// Fade out and pause.
    Pause,
}

/// One track being played, with the volume it is heading to.
struct Voice {
    player: Player,
    volume: f32,
    target: f32,
    /// Volume change per tick.
    step: f32,
}

struct Engine {
    device: MixerDeviceSink,
    voices: [Option<Voice>; 2],
}

impl Engine {
    fn open() -> Option<Self> {
        match DeviceSinkBuilder::open_default_sink() {
            Ok(mut device) => {
                device.log_on_drop(false);
                Some(Self { device, voices: [None, None] })
            }
            Err(error) => {
                log::warn!("No audio output: {error}");
                None
            }
        }
    }

    /// The voice for `track`, created paused and silent the first time.
    fn voice(&mut self, track: Track) -> Option<&mut Voice> {
        if self.voices[track.index()].is_none() {
            let source = match Decoder::new_looped(Cursor::new(track.data())) {
                Ok(source) => source,
                Err(error) => {
                    log::warn!("Cannot decode {track:?}: {error}");
                    return None;
                }
            };
            let player = Player::connect_new(self.device.mixer());
            player.pause();
            player.set_volume(0.0);
            player.append(source);
            self.voices[track.index()] = Some(Voice { player, volume: 0.0, target: 0.0, step: 0.0 });
        }
        self.voices[track.index()].as_mut()
    }

    fn fade(&mut self, track: Track, target: f32, over: Duration) {
        let Some(voice) = self.voice(track) else { return };
        voice.target = target;
        let ticks = (over.as_secs_f32() / TICK.as_secs_f32()).max(1.0);
        voice.step = (track.volume() / ticks).max(0.001);
        if target > 0.0 {
            voice.player.play();
        }
    }

    fn handle(&mut self, command: Command) {
        match command {
            Command::Play(track) => {
                let other = if track == Track::Ambient { Track::Easter } else { Track::Ambient };
                if let Some(voice) = &mut self.voices[other.index()] {
                    voice.player.pause();
                    voice.volume = 0.0;
                    voice.target = 0.0;
                    voice.player.set_volume(0.0);
                }
                self.fade(track, track.volume(), FADE);
            }
            Command::Crossfade(track) => {
                let other = if track == Track::Ambient { Track::Easter } else { Track::Ambient };
                if self.voices[other.index()].is_some() {
                    self.fade(other, 0.0, FADE);
                }
                self.fade(track, track.volume(), FADE);
            }
            Command::Pause => {
                for track in [Track::Ambient, Track::Easter] {
                    if self.voices[track.index()].is_some() {
                        self.fade(track, 0.0, PAUSE_FADE);
                    }
                }
            }
        }
    }

    /// Moves every voice one step towards its target. Returns whether a fade is still running.
    fn tick(&mut self) -> bool {
        let mut fading = false;
        for voice in self.voices.iter_mut().flatten() {
            if voice.volume == voice.target {
                continue;
            }
            voice.volume = if voice.volume < voice.target {
                (voice.volume + voice.step).min(voice.target)
            } else {
                (voice.volume - voice.step).max(voice.target)
            };
            voice.player.set_volume(voice.volume);
            if voice.volume == voice.target && voice.target == 0.0 {
                voice.player.pause();
            }
            fading |= voice.volume != voice.target;
        }
        fading
    }

    fn silent(&self) -> bool {
        self.voices.iter().flatten().all(|voice| voice.player.is_paused())
    }
}

fn run(commands: mpsc::Receiver<Command>) {
    let mut engine: Option<Engine> = None;
    let mut fading = false;

    loop {
        let timeout = match &engine {
            Some(_) if fading => TICK,
            Some(engine) if engine.silent() => RELEASE_AFTER,
            _ => Duration::from_secs(3600),
        };

        match commands.recv_timeout(timeout) {
            Ok(command) => {
                // Nothing to pause when the device is already released.
                if engine.is_none() && !matches!(command, Command::Pause) {
                    engine = Engine::open();
                }
                if let Some(engine) = &mut engine {
                    engine.handle(command);
                    fading = true;
                }
            }
            Err(RecvTimeoutError::Timeout) => {
                if fading {
                    fading = engine.as_mut().is_some_and(Engine::tick);
                } else if engine.as_ref().is_some_and(Engine::silent) {
                    engine = None;
                }
            }
            Err(RecvTimeoutError::Disconnected) => return,
        }
    }
}

/// Handle to the music thread, started on first use.
#[derive(Default)]
pub struct Music {
    commands: Option<mpsc::Sender<Command>>,
}

impl Music {
    fn send(&mut self, command: Command) {
        let commands = self.commands.get_or_insert_with(|| {
            let (sender, receiver) = mpsc::channel();
            std::thread::spawn(move || run(receiver));
            sender
        });
        let _ = commands.send(command);
    }

    pub fn play(&mut self, track: Track) {
        self.send(Command::Play(track));
    }

    pub fn crossfade(&mut self, track: Track) {
        self.send(Command::Crossfade(track));
    }

    pub fn pause(&mut self) {
        // Starting the thread just to tell it to be quiet would be pointless.
        if self.commands.is_some() {
            self.send(Command::Pause);
        }
    }
}
