const marks = document.querySelectorAll(".mark-cycle img");
let current = 0;

function cycleMarks() {
  marks.forEach(mark => mark.style.opacity = 0);
  marks[current].style.opacity = 1;
  current = (current + 1) % marks.length;
}

cycleMarks();
setInterval(cycleMarks, 1750);