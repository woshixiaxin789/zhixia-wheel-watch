// Zhixia Wheel Watch — read-only Squeekchain dashboard (Sepolia).
const RPCS = ["https://ethereum-sepolia-rpc.publicnode.com", "https://sepolia.drpc.org", "https://rpc.sepolia.org"];
const CORE = "0x74665dAecA35A2303e767E76a2FF1FB6F93e119f";
const SQK  = "0x6872bfa5ccc3e9e440c6c16e5ffdabb8dba4cc76";
const NFT  = "0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6";
const SEL = { state: "0xc19d93fb", totalSupply: "0x18160ddd", balanceOf: "0x70a08231" };
const UNITS_PER_BLOCK = 1_000_000_000n;
const $ = (id) => document.getElementById(id);

async function ethCall(to, data) {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }) });
      const j = await r.json();
      if (j.result) return j.result;
    } catch (e) { /* try next RPC */ }
  }
  throw new Error("All RPCs failed");
}
const words = (hex) => { const h = hex.slice(2), out = []; for (let i = 0; i < h.length; i += 64) out.push(BigInt("0x" + h.slice(i, i + 64))); return out; };
const fmt = (n) => n.toLocaleString("en-US");
const fmtSqk = (wei) => fmt(Number(wei / 10n ** 18n));

// progress history to estimate speed
const hist = [];
let lastHeight = null;

async function refresh() {
  try {
    const [st, sqk, nft] = await Promise.all([ethCall(CORE, SEL.state), ethCall(SQK, SEL.totalSupply), ethCall(NFT, SEL.totalSupply)]);
    // CoreState: settledThroughRound, cumulativeWork, cumulativeBlockUnits, blockHeight, blockProgress, workPerThousandBlocks, authorizationNonce, paused
    const [round, cumWork, cumUnits, height, progress, wptb, , paused] = words(st);
    const pct = Number(progress * 10000n / UNITS_PER_BLOCK) / 100;
    $("status").textContent = paused ? "Paused" : "Running";
    $("status").className = "v " + (paused ? "bad" : "ok");
    $("wheelCard").classList.toggle("paused", paused === 1n);
    $("height").textContent = "#" + fmt(Number(height));
    $("prog").style.width = pct + "%";
    $("diff").textContent = fmt(Number(wptb));
    $("work").textContent = "Total wheel work: " + fmt(Number(cumWork)) + " · round " + fmt(Number(round));
    $("sqk").textContent = fmtSqk(BigInt(sqk)) + " SQK";
    $("nft").textContent = "Squeeks in circulation: " + fmt(Number(BigInt(nft)));

    const now = Date.now(), units = cumUnits;
    hist.push({ t: now, u: units }); while (hist.length > 40) hist.shift();
    let eta = "";
    const first = hist[0];
    if (hist.length > 1 && units > first.u) {
      const rate = Number(units - first.u) / ((now - first.t) / 60000); // units per minute
      const left = Number(UNITS_PER_BLOCK - progress);
      eta = " · next block in ~" + Math.max(1, Math.round(left / rate)) + " min";
    }
    $("progTxt").textContent = pct.toFixed(2) + "% to block #" + fmt(Number(height) + 1) + eta;
    $("updated").textContent = "Updated " + new Date().toLocaleTimeString() + " (refreshes every 30 s; settlements land in 10-minute rounds)";

    if (lastHeight !== null && height > lastHeight) scoreGuess();
    lastHeight = height;
  } catch (e) {
    $("updated").textContent = "Could not reach a Sepolia RPC — retrying…";
  }
}

// next-block guessing game
function scoreGuess() {
  const g = JSON.parse(localStorage.getItem("zw_guess") || "null");
  if (!g) return;
  const actual = (Date.now() - g.at) / 60000;
  const off = Math.abs(actual - g.min);
  const pts = Math.max(0, Math.round(100 - off * 10));
  const total = Number(localStorage.getItem("zw_score") || 0) + pts;
  localStorage.setItem("zw_score", total);
  localStorage.removeItem("zw_guess");
  $("guessOut").innerHTML = `Block landed after <b>${actual.toFixed(1)} min</b> — you guessed ${g.min}. +${pts} pts`;
  showScore();
}
function showScore() { $("score").textContent = "Your total score: " + (localStorage.getItem("zw_score") || 0); }
$("lock").onclick = () => {
  const m = Number($("guess").value);
  if (!(m > 0)) return;
  localStorage.setItem("zw_guess", JSON.stringify({ min: m, at: Date.now() }));
  $("guessOut").textContent = `Locked: ${m} min. Keep this tab open until the next block.`;
};
(() => { const g = JSON.parse(localStorage.getItem("zw_guess") || "null"); if (g) $("guessOut").textContent = `Active guess: ${g.min} min`; showScore(); })();

// wallet checker
$("check").onclick = async () => {
  const a = $("addr").value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { $("walletOut").innerHTML = '<span class="bad">That is not a valid address.</span>'; return; }
  $("walletOut").textContent = "Reading…";
  const data = SEL.balanceOf + a.slice(2).toLowerCase().padStart(64, "0");
  try {
    const [b, n] = await Promise.all([ethCall(SQK, data), ethCall(NFT, data)]);
    $("walletOut").innerHTML = `SQK: <b>${fmtSqk(BigInt(b))}</b> · Squeeks: <b>${fmt(Number(BigInt(n)))}</b>`;
  } catch (e) { $("walletOut").innerHTML = '<span class="bad">RPC error, try again.</span>'; }
};

refresh();
setInterval(refresh, 30000);
