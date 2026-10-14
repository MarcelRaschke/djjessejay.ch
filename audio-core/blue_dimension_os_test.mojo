from blue_dimension_os import (
    AudioMeter,
    MasterBusPolicy,
    SoundKurator,
    TrackMetadata,
    to_dbfs,
)


def test_track_routing():
    var kurator = SoundKurator()

    var acid = TrackMetadata(
        "test-acid",
        135.0,
        True,
        True,
        False,
        False,
        False,
    )
    assert kurator.evaluate_track(acid) == "acid-techno"

    var progressive = TrackMetadata(
        "test-progressive",
        138.0,
        True,
        False,
        True,
        False,
        False,
    )
    assert kurator.evaluate_track(progressive) == "trance-progressive"

    var rejected = TrackMetadata(
        "test-rejected",
        130.0,
        True,
        False,
        False,
        True,
        False,
    )
    assert kurator.evaluate_track(rejected) == "rejected-reprocessed"


def test_meter():
    var meter = AudioMeter()
    meter.push(0.5)
    meter.push(-0.5)

    assert meter.sample_count == 2
    assert meter.sample_peak > 0.499
    assert meter.sample_peak < 0.501
    assert meter.compute_rms() > 0.499
    assert meter.compute_rms() < 0.501
    assert to_dbfs(0.0) == -180.0


def test_master_ceiling():
    var policy = MasterBusPolicy("acid-techno")

    assert policy.apply_peak_ceiling(-0.2) == -1.0
    assert policy.apply_peak_ceiling(-1.2) == -1.2
    assert policy.target_lufs == -10.0
    assert policy.sub_bass_mono_cutoff_hz == 150.0
    assert policy.tape_speed_ips == 30


def main():
    test_track_routing()
    test_meter()
    test_master_ceiling()
    print("BLUE DIMENSION OS // TESTS PASS")
