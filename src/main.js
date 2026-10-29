import "./style.css";

const counter = document.querySelector("#counter");
const status = document.querySelector("#status");
let clicks = 0;

counter.addEventListener("click", () => {
  clicks += 1;
  counter.textContent = `Clicks: ${clicks}`;
  status.textContent = "JavaScript is working. Make this app your own!";
});
