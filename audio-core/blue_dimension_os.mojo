# Blue Dimension OS (Zürich, Est. 1997)
# Audio analysis and master-bus policy core.
#
# Scope:
#   - deterministic track classification metadata
#   - sample-peak / RMS measurement
#   - master-bus ceiling policy
#
# This module intentionally does NOT implement TouchDesigner, OSC, NDI,
# broadcast scheduling, or GPU rendering. Those are separate pipeline layers.

from math import sqrt, log

comptime LN10: Float32 = 2.302585092994046
comptime DEFAULT_TRUE_PEAK_CEILING_DBFS: Float32 = -1.0
comptime DEFAULT_SUB_BASS_MONO_CUTOFF_HZ: Float32 = 150.0


def to_dbfs(linear: Float32) -> Float32:
    """Convert linear amplitude to dBFS with a finite silence floor."""
    if linear <= 0.0:
        return Float32(-180.0)
    return 20.0 * (log(linear) / LN10)



struct TrackMetadata:
    var title: String
    var bpm: Float32
    var has_four_on_floor: Bool
    var has_303_squelch: Bool
    var has_vsolar_detune: Bool
    var is_commercial_edm: Bool
    var is_sterile_idm: Bool

    def __init__(
        out self,
        title: String,
        bpm: Float32,
        four_on_floor: Bool,
        squelch_303: Bool,
        vsolar: Bool,
        edm: Bool,
        idm: Bool,
    ):
        self.title = title
        self.bpm = bpm
        self.has_four_on_floor = four_on_floor
        self.has_303_squelch = squelch_303
        self.has_vsolar_detune = vsolar
        self.is_commercial_edm = edm
        self.is_sterile_idm = idm


struct SoundKurator:
    """Deterministic metadata router; no audio mutation occurs here."""

    def evaluate_track(self, track: TrackMetadata) -> String:
        if track.is_commercial_edm or track.is_sterile_idm:
            return "rejected-reprocessed"

        if (
            track.bpm >= 120.0
            and track.bpm <= 140.0
            and track.has_four_on_floor
        ):
            if track.has_303_squelch:
                return "acid-techno"
            elif track.has_vsolar_detune:
                return "trance-progressive"
            else:
                return "club-edm-house-trance"
        elif track.bpm >= 118.0 and track.bpm <= 125.0:
            return "house-deep-tech"
        elif track.bpm >= 60.0 and track.bpm <= 95.0:
            return "modern-rnb-neo-soul"
        else:
            return "progressive-techno"


struct AudioMeter:
    """Streaming RMS and sample-peak meter.

    The previous RMS-times-sqrt(2) calculation was removed because it is not
    a true-peak measurement. True peak requires an oversampling/interpolation
    stage and is deliberately a separate DSP task.
    """

    var sum_of_squares: Float32
    var sample_count: Int
    var sample_peak: Float32

    def __init__(out self):
        self.sum_of_squares = 0.0
        self.sample_count = 0
        self.sample_peak = 0.0

    def push(mut self, sample: Float32):
        self.sum_of_squares += sample * sample
        self.sample_count += 1

        var magnitude = sample
        if magnitude < 0.0:
            magnitude = -magnitude
        if magnitude > self.sample_peak:
            self.sample_peak = magnitude

    def compute_rms(self) -> Float32:
        if self.sample_count <= 0:
            return 0.0
        return sqrt(self.sum_of_squares / Float32(self.sample_count))

    def report(self) -> String:
        var rms = self.compute_rms()
        return (
            "RMS: "
            + String(rms)
            + " ("
            + String(to_dbfs(rms))
            + " dBFS) | Sample Peak: "
            + String(self.sample_peak)
            + " ("
            + String(to_dbfs(self.sample_peak))
            + " dBFS)"
        )


struct MasterBusPolicy:
    var peak_ceiling_dbfs: Float32
    var sub_bass_mono_cutoff_hz: Float32
    var target_lufs: Float32
    var tape_speed_ips: Int

    def __init__(out self, genre: String):
        self.peak_ceiling_dbfs = DEFAULT_TRUE_PEAK_CEILING_DBFS
        self.sub_bass_mono_cutoff_hz = DEFAULT_SUB_BASS_MONO_CUTOFF_HZ
        self.tape_speed_ips = 30

        if (
            genre == "acid-techno"
            or genre == "club-edm-house-trance"
            or genre == "trance-progressive"
        ):
            self.target_lufs = -10.0
        else:
            self.target_lufs = -14.0

    def apply_peak_ceiling(self, peak_dbfs: Float32) -> Float32:
        if peak_dbfs > self.peak_ceiling_dbfs:
            return self.peak_ceiling_dbfs
        return peak_dbfs


def main():
    print("BLUE DIMENSION OS // AUDIO CORE")
    print("Signal 97.5 MHz // Zürich // Est. 1997")

    var kurator = SoundKurator()

    var track = TrackMetadata(
        "Zürich Untergrund 303",
        135.0,
        True,
        True,
        False,
        False,
        False,
    )

    var genre = kurator.evaluate_track(track)
    var policy = MasterBusPolicy(genre)

    var meter = AudioMeter()
    meter.push(0.79)
    meter.push(-0.83)
    meter.push(0.65)
    meter.push(-0.58)

    print("Track: '" + track.title + "' -> " + genre)
    print("[METER] " + meter.report())
    print(
        "[MASTER] Peak ceiling: "
        + String(policy.peak_ceiling_dbfs)
        + " dBFS | Target: "
        + String(policy.target_lufs)
        + " LUFS"
    )
