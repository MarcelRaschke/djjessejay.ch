(() => {
  const tuner = document.querySelector(".tuner");
  const slider = document.querySelector("#frequency");
  const output = document.querySelector(".tuner-readout output");
  const status = document.querySelector(".tuner-readout span");
  const lockButton = document.querySelector(".tuner button");

  if (!tuner || !slider || !output || !status || !lockButton) return;

  const render = () => {
    const frequency = Number(slider.value);
    const locked = Math.abs(frequency - 97.5) < 0.05;
    output.textContent = frequency.toFixed(1);
    status.textContent = locked ? "SIGNAL LOCK" : "SIGNAL SEARCH";
    tuner.classList.toggle("is-locked", locked);
  };

  slider.addEventListener("input", render);
  lockButton.addEventListener("click", () => {
    slider.value = "97.5";
    render();
  });

  render();
})();
