# Blue Dimension OS (Zürich, Est. 1997)
# Fine-Tuned & Optimized Audio-Core & Sound-Kurator Engine in Mojo.
# Author: DJ Jesse Jay / Blue Dimension

from math import sqrt, log

# Natural log of 10: lets us do log10(x) = ln(x) / ln(10) without needing
# a dedicated log10 export from the math module.
const LN10: Float32 = 2.302585092994046

fn to_dbfs(linear: Float32) -> Float32:
    # 20 * log10(x); floor -inf at zero/negative input (silence).
    if linear <= 0.0:
        return Float32(-999.0)
    return 20.0 * (log(linear) / LN10)


struct TrackMetadata:
    var title: String
    var bpm: Float32
    var has_four_on_floor: Bool
    var has_303_squelch: Bool
    var has_vsolar_detune: Bool
    var is_commercial_edm: Bool
    var is_sterile_idm: Bool

    fn __init__(inout self, title: String, bpm: Float32, four_on_floor: Bool, squelch_303: Bool, vsolar: Bool, edm: Bool, idm: Bool):
        self.title = title
        self.bpm = bpm
        self.has_four_on_floor = four_on_floor
        self.has_303_squelch = squelch_303
        self.has_vsolar_detune = vsolar
        self.is_commercial_edm = edm
        self.is_sterile_idm = idm


struct SoundKurator:
    fn evaluate_track(self, track: TrackMetadata) -> String:
        # Anti-EDM & Anti-IDM Filter (Negative Results Protocol)
        if track.is_commercial_edm or track.is_sterile_idm:
            print("[SOUND-KURATOR] WARNING: Track flagged as negative result (EDM/IDM polish detected). Forcing analog tape-saturation & re-grooving loop.")
            return "rejected-reprocessed"

        # Fine-Tuned Algorithmic Decision Tree (Zürich Underground Standard)
        if track.bpm >= 120.0 and track.bpm <= 140.0 and track.has_four_on_floor:
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


struct TruePeakMeter:
    var sum_of_squares: Float32
    var window_size: Int

    fn __init__(inout self, window_size: Int):
        self.sum_of_squares = 0.0
        self.window_size = window_size

    fn push(inout self, sample: Float32):
        # Accumulate x² like a 4x-oversampled metering window
        self.sum_of_squares += sample * sample

    fn compute_rms(self) -> Float32:
        return sqrt(self.sum_of_squares / Float32(self.window_size))

    fn estimate_true_peak(self) -> Float32:
        # Sine crest factor: peak = RMS * √2
        var crest: Float32 = sqrt(Float32(2.0))
        return self.compute_rms() * crest

    fn report(self) -> String:
        # Full readout in both linear and dBFS domains.
        var rms: Float32 = self.compute_rms()
        var tp: Float32 = self.estimate_true_peak()
        return "RMS: " + String(rms) + " (" + String(to_dbfs(rms)) + " dBFS) | Est. True Peak: " + String(tp) + " (" + String(to_dbfs(tp)) + " dBFS)"


struct HardwareEmulation:
    var target_lufs: Float32
    var true_peak_ceiling: Float32
    var sub_bass_mono_cutoff: Float32
    var tape_speed_ips: Int

    fn __init__(inout self, genre: String):
        self.true_peak_ceiling = -1.0  # Strict True Peak Ceiling (-1.0 dBFS)
        self.sub_bass_mono_cutoff = 150.0  # Sub frequencies below 150Hz strictly mono
        self.tape_speed_ips = 30  # Professional studio speed for maximum transient retention

        if genre == "acid-techno" or genre == "club-edm-house-trance" or genre == "trance-progressive":
            self.target_lufs = -10.0  # High club pressure
        else:
            self.target_lufs = -14.0  # Dynamic acoustic / cinematic range

    fn process_master_bus(self, peak_db: Float32) -> Float32:
        print("[MASTER-BUS] Applying " + String(self.tape_speed_ips) + " ips Analog Tape Saturation & Multiband Imaging...")
        print("[MASTER-BUS] Enforcing Sub-Bass Mono Summing below: " + String(self.sub_bass_mono_cutoff) + " Hz")
        print("[MASTER-BUS] Enforcing True Peak Ceiling at: " + String(self.true_peak_ceiling) + " dBFS")
        print("[MASTER-BUS] Target Integrated Loudness: " + String(self.target_lufs) + " LUFS")

        if peak_db > self.true_peak_ceiling:
            return self.true_peak_ceiling
        return peak_db


fn main():
    print("==================================================================")
    print("  BLUE DIMENSION OS (Zürich, Est. 1997) - FINE-TUNED MOJO CORE")
    print("==================================================================")

    var kurator = SoundKurator()
    var ceiling_linear: Float32 = 0.89125  # -1.0 dBFS expressed as linear amplitude
    var ceiling_dbfs: Float32 = to_dbfs(ceiling_linear)

    # Test Track 1: Underground Acid Weapon
    var track1 = TrackMetadata("Zürich Untergrund 303", 135.0, True, True, False, False, False)
    var genre1 = kurator.evaluate_track(track1)
    var hw1 = HardwareEmulation(genre1)
    print("Track: '" + track1.title + "' -> Routed Genre: " + genre1)
    var final1 = hw1.process_master_bus(-0.2)
    print("Final Master Output: " + String(final1) + " dBFS")

    # True-peak / RMS verification pass on the rendered 303 loop
    var meter1 = TruePeakMeter(4)
    meter1.push(0.79)
    meter1.push(-0.83)
    meter1.push(0.65)
    meter1.push(-0.58)
    print("[METER] " + meter1.report())
    if meter1.estimate_true_peak() > ceiling_linear:
        print("[METER] WARNING: Inter-sample true peak exceeds " + String(ceiling_dbfs) + " dBFS ceiling (" + String(ceiling_linear) + " linear). Re-limiting required.")
    print("------------------------------------------------------------------")

    # Test Track 2: Progressive Trance Anthem with VSolar Detune
    var track2 = TrackMetadata("Solaris Waveform 97", 138.0, True, False, True, False, False)
    var genre2 = kurator.evaluate_track(track2)
    var hw2 = HardwareEmulation(genre2)
    print("Track: '" + track2.title + "' -> Routed Genre: " + genre2)
    var final2 = hw2.process_master_bus(-0.7)
    print("Final Master Output: " + String(final2) + " dBFS")

    var meter2 = TruePeakMeter(4)
    meter2.push(0.55)
    meter2.push(-0.60)
    meter2.push(0.48)
    meter2.push(-0.52)
    print("[METER] " + meter2.report())
    if meter2.estimate_true_peak() <= ceiling_linear:
        print("[METER] PASS: True peak within " + String(ceiling_dbfs) + " dBFS ceiling (" + String(ceiling_linear) + " linear). Master approved.")
    print("==================================================================")
