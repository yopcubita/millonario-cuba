(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);

  const PREMIOS = [500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000, 150000, 250000, 400000, 600000, 1000000];
  const SEGUROS = [4, 9];             // índices: pregunta 5 y 10
  const CUBA = [2, 5, 8, 11, 14];     // preguntas 3, 6, 9, 12 y 15
  const LETRAS = ["A", "B", "C", "D"];
  const AMIGOS = [
    ["Yunior", "Asere, "], ["Tía Mayra", "Mi niño, "], ["Yanelis", "Mira, "],
    ["El profe Ramiro", "A ver, "], ["Dayron", "Oye, "], ["Abuela Cachita", "Ay, mijo, "]
  ];

  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0CUP";
  const mezclar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const tier = (i) => (i < 5 ? "facil" : i < 10 ? "medio" : "dificil");

  // ---------- Sonido (sintetizado, sin archivos) ----------
  let ctx = null, mudo = localStorage.getItem("mill_mudo") === "1";
  function tono(freq, dur, tipo = "sine", vol = 0.15, delay = 0) {
    if (mudo) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  const sfx = {
    tap: () => tono(660, 0.08, "triangle", 0.08),
    suspenso: () => { for (let i = 0; i < 6; i++) tono(220 + i * 20, 0.18, "sine", 0.06, i * 0.25); },
    bien: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.35, "triangle", 0.12, i * 0.1)),
    mal: () => { tono(196, 0.6, "sawtooth", 0.08); tono(147, 0.8, "sawtooth", 0.08, 0.2); },
    cuba: () => [392, 523, 659, 784, 659, 784].forEach((f, i) => tono(f, 0.22, "square", 0.05, i * 0.13)),
    millon: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, 0.4, "triangle", 0.12, i * 0.14))
  };
  function pintarSonido() { $("#btn-sonido").classList.toggle("mudo", mudo); }

  // ---------- Estado ----------
  let S = null;
  function nuevaPartida() {
    const usadas = { general: { facil: [], medio: [], dificil: [] }, cuba: { facil: [], medio: [], dificil: [] } };
    const lista = PREMIOS.map((_, i) => {
      const cat = CUBA.includes(i) ? "cuba" : "general", t = tier(i);
      const banco = PREGUNTAS[cat][t];
      let k; do { k = Math.floor(Math.random() * banco.length); } while (usadas[cat][t].includes(k) && usadas[cat][t].length < banco.length);
      usadas[cat][t].push(k);
      const [q, correcta, ...malas] = banco[k];
      const opciones = mezclar([correcta, ...malas]);
      return { q, opciones, correcta: opciones.indexOf(correcta), cuba: cat === "cuba", t };
    });
    S = { i: 0, lista, comodines: { c5050: true, publico: true, llamada: true }, ocultas: [], bloqueado: false };
  }

  const ganadoAsegurado = () => { let m = 0; SEGUROS.forEach((s) => { if (S.i > s) m = PREMIOS[s]; }); return m; };
  const ganadoActual = () => (S.i > 0 ? PREMIOS[S.i - 1] : 0);

  // ---------- Pantallas ----------
  function mostrar(id) { document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id)); }

  function pintarRecord() {
    const r = +localStorage.getItem("mill_record") || 0;
    $("#record").textContent = r ? "Tu mejor premio: " + fmt(r) : "";
  }

  function pintarEscalera() {
    const ol = $("#lista-premios"); ol.innerHTML = "";
    PREMIOS.forEach((p, i) => {
      const li = document.createElement("li");
      if (SEGUROS.includes(i)) li.classList.add("seguro");
      if (CUBA.includes(i)) li.classList.add("cuba");
      if (S && i < S.i) li.classList.add("ganado");
      if (S && i === S.i) li.classList.add("actual");
      li.innerHTML = `<span class="n">${i + 1}</span><span class="m">${fmt(p)}</span>`;
      ol.appendChild(li);
    });
  }

  async function pintarPregunta() {
    const P = S.lista[S.i];
    S.ocultas = []; S.bloqueado = false;
    $("#nivel-label").textContent = `Pregunta ${S.i + 1} de 15`;
    $("#monto-actual").textContent = fmt(PREMIOS[S.i]);
    $("#monto-plantarse").textContent = fmt(ganadoActual());
    $("#btn-plantarse").style.visibility = S.i > 0 ? "visible" : "hidden";
    const et = $("#etiqueta"), pr = $("#pregunta");
    et.textContent = P.cuba ? "Pregunta de Cuba" : "Cultura general";
    et.classList.toggle("cuba", P.cuba); pr.classList.toggle("cuba", P.cuba);
    pr.textContent = P.q;
    const cont = $("#respuestas"); cont.innerHTML = ""; cont.classList.remove("bloqueadas");
    P.opciones.forEach((op, k) => {
      const b = document.createElement("button");
      b.className = "resp"; b.dataset.k = k;
      b.innerHTML = `<span class="letra">${LETRAS[k]}</span><span></span>`;
      b.lastChild.textContent = op;
      b.addEventListener("click", () => responder(k));
      cont.appendChild(b);
    });
    $("#c-5050").classList.toggle("usado", !S.comodines.c5050);
    $("#c-publico").classList.toggle("usado", !S.comodines.publico);
    $("#c-llamada").classList.toggle("usado", !S.comodines.llamada);
  }

  async function siguiente() {
    const P = S.lista[S.i];
    if (P.cuba) {
      $("#intro-sub").textContent = `Por ${fmt(PREMIOS[S.i])}`;
      $("#intro-cuba").classList.add("abierto"); sfx.cuba();
      await espera(1900);
      $("#intro-cuba").classList.remove("abierto");
    }
    pintarPregunta();
  }

  async function responder(k) {
    if (S.bloqueado) return;
    S.bloqueado = true; sfx.tap();
    const P = S.lista[S.i], botones = [...document.querySelectorAll(".resp")];
    $("#respuestas").classList.add("bloqueadas");
    botones[k].classList.add("elegida");
    sfx.suspenso();
    await espera(S.i >= 10 ? 2400 : 1600);
    botones[k].classList.remove("elegida");
    if (k === P.correcta) {
      botones[k].classList.add("correcta");
      if (S.i === 14) { sfx.millon(); await espera(1600); return terminar("millon"); }
      sfx.bien(); await espera(1500);
      S.i++;
      if (SEGUROS.includes(S.i - 1)) {
        await modal(`<h4>Premio asegurado</h4><p>Ya tienes <b>${fmt(PREMIOS[S.i - 1])}</b> garantizados pase lo que pase.</p>`, [["Seguir", true]]);
      }
      siguiente();
    } else {
      botones[k].classList.add("mal");
      botones[P.correcta].classList.add("correcta");
      sfx.mal(); await espera(2200);
      terminar("perdio");
    }
  }

  function terminar(modo) {
    let monto, kicker, titulo, texto;
    const P = S.lista[S.i];
    if (modo === "millon") {
      monto = 1000000; kicker = "¡Lo lograste!"; titulo = "Eres millonario";
      texto = "Respondiste las 15 preguntas, incluidas las cinco de Cuba. ¡Qué clase de bárbaro!";
    } else if (modo === "plantado") {
      monto = ganadoActual(); kicker = "Te plantaste"; titulo = "Te llevas";
      texto = `La respuesta correcta era: ${P.opciones[P.correcta]}.`;
    } else {
      monto = ganadoAsegurado(); kicker = "Respuesta incorrecta"; titulo = monto ? "Te llevas" : "Te vas sin premio";
      texto = monto ? "Gracias a tu premio asegurado no te vas con las manos vacías." : "No alcanzaste ningún premio asegurado. ¡Inténtalo otra vez!";
    }
    const r = +localStorage.getItem("mill_record") || 0;
    if (monto > r) { localStorage.setItem("mill_record", monto); if (monto) texto += " ¡Nuevo récord!"; }
    $("#final-kicker").textContent = kicker;
    $("#final-titulo").textContent = titulo;
    $("#final-monto").textContent = fmt(monto);
    $("#final-texto").textContent = texto;
    mostrar("s-final");
  }

  // ---------- Comodines ----------
  function c5050() {
    if (!S.comodines.c5050 || S.bloqueado) return;
    S.comodines.c5050 = false; sfx.tap();
    const P = S.lista[S.i];
    const malas = mezclar([0, 1, 2, 3].filter((k) => k !== P.correcta)).slice(0, 2);
    S.ocultas = malas;
    malas.forEach((k) => document.querySelector(`.resp[data-k="${k}"]`).classList.add("oculta"));
    $("#c-5050").classList.add("usado");
  }

  function c_publico() {
    if (!S.comodines.publico || S.bloqueado) return;
    S.comodines.publico = false; sfx.tap(); $("#c-publico").classList.add("usado");
    const P = S.lista[S.i];
    const acierto = { facil: 0.9, medio: 0.7, dificil: 0.5 }[P.t];
    const vivas = [0, 1, 2, 3].filter((k) => !S.ocultas.includes(k));
    let favorita = P.correcta;
    if (Math.random() > acierto) favorita = mezclar(vivas.filter((k) => k !== P.correcta))[0];
    const pesos = [0, 0, 0, 0];
    vivas.forEach((k) => (pesos[k] = Math.random() * 20 + 5));
    pesos[favorita] += { facil: 70, medio: 45, dificil: 25 }[P.t];
    const total = pesos.reduce((a, b) => a + b, 0);
    let pct = pesos.map((p) => Math.round((p / total) * 100));
    pct[favorita] += 100 - pct.reduce((a, b) => a + b, 0);
    const html = `<h4>El público opina</h4><div class="barras">${pct.map((p, k) =>
      `<div><span>${p}%</span><i data-h="${p}"></i><span>${LETRAS[k]}</span></div>`).join("")}</div>`;
    modal(html, [["Gracias", true]]);
    requestAnimationFrame(() => setTimeout(() => document.querySelectorAll(".barras i").forEach((i) => (i.style.height = i.dataset.h * 1.1 + "px")), 60));
  }

  function c_llamada() {
    if (!S.comodines.llamada || S.bloqueado) return;
    S.comodines.llamada = false; sfx.tap(); $("#c-llamada").classList.add("usado");
    const P = S.lista[S.i];
    const [nombre, saludo] = AMIGOS[Math.floor(Math.random() * AMIGOS.length)];
    const acierto = { facil: 0.92, medio: 0.72, dificil: 0.5 }[P.t];
    const vivas = [0, 1, 2, 3].filter((k) => !S.ocultas.includes(k));
    let k = P.correcta;
    if (Math.random() > acierto) k = mezclar(vivas.filter((x) => x !== P.correcta))[0];
    const seguro = P.t === "facil" ? "estoy casi seguro" : P.t === "medio" ? "creo" : "no estoy muy seguro, pero diría";
    const msg = `${saludo}${seguro} que es la <b>${LETRAS[k]}: ${P.opciones[k]}</b>.`;
    modal(`<h4>Llamada a ${nombre}</h4><div class="llamada"><div class="avatar">${nombre.split(" ").pop()[0]}</div><div class="burbuja">${msg}</div></div>`, [["Colgar", true]]);
  }

  // ---------- Modal ----------
  function modal(html, acciones) {
    return new Promise((res) => {
      $("#modal-cuerpo").innerHTML = html;
      const cont = $("#modal-acciones"); cont.innerHTML = "";
      acciones.forEach(([txt, val], idx) => {
        const b = document.createElement("button");
        b.textContent = txt; b.className = idx === acciones.length - 1 ? "m-primario" : "m-secundario";
        b.onclick = () => { $("#modal").classList.remove("abierto"); res(val); };
        cont.appendChild(b);
      });
      $("#modal").classList.add("abierto");
    });
  }

  // ---------- Eventos ----------
  $("#btn-jugar").onclick = () => { sfx.tap(); nuevaPartida(); mostrar("s-juego"); siguiente(); };
  $("#btn-otra").onclick = $("#btn-jugar").onclick;
  $("#btn-inicio").onclick = () => { pintarRecord(); mostrar("s-inicio"); };
  $("#btn-reglas").onclick = () => modal(`<h4>Cómo se juega</h4><ul>
      <li>Responde 15 preguntas de dificultad creciente.</li>
      <li>Las preguntas <b>3, 6, 9, 12 y 15</b> son sobre Cuba: historia, cultura, geografía, música y deporte.</li>
      <li>Los premios se pagan en <b>pesos cubanos (CUP)</b>, hasta 1 000 000 CUP.</li>
      <li>Las preguntas 5 (5 000 CUP) y 10 (100 000 CUP) aseguran tu premio.</li>
      <li>Tienes tres comodines: 50:50, preguntar al público y llamar a un amigo.</li>
      <li>Puedes plantarte en cualquier momento y llevarte lo ganado.</li></ul>`, [["Entendido", true]]);
  $("#btn-plantarse").onclick = async () => {
    if (S.bloqueado) return;
    const ok = await modal(`<h4>¿Plantarte?</h4><p>Te llevarías <b>${fmt(ganadoActual())}</b>.</p>`, [["Seguir jugando", false], ["Plantarme", true]]);
    if (ok) terminar("plantado");
  };
  $("#btn-escalera").onclick = () => { pintarEscalera(); $("#escalera").classList.add("abierto"); };
  $("#cerrar-escalera").onclick = () => $("#escalera").classList.remove("abierto");
  $("#btn-sonido").onclick = () => { mudo = !mudo; localStorage.setItem("mill_mudo", mudo ? "1" : "0"); pintarSonido(); };
  $("#c-5050").onclick = c5050;
  $("#c-publico").onclick = c_publico;
  $("#c-llamada").onclick = c_llamada;

  pintarSonido(); pintarRecord();
})();
