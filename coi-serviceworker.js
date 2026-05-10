/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, MIT — patched for DDC */
let coepCredentialless = !1;
if (typeof window === "undefined") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
  self.addEventListener("message", e => {
    if (!e.data) return;
    if (e.data.type === "deregister") {
      self.registration.unregister().then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)));
    } else if (e.data.type === "coepCredentialless") {
      coepCredentialless = e.data.value;
    }
  });
  self.addEventListener("fetch", function (event) {
    const req = event.request;
    if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;
    // DDC patch: ignora schemi non http/https. blob:, data:, file: ecc.
    // sono gestiti dal browser nativamente — se li intercettiamo qui,
    // l'offscreen <video> usato per la conversione si rompe (carica solo
    // il primo frame).
    let proto = "";
    try { proto = new URL(req.url).protocol; } catch (_) { return; }
    if (proto !== "http:" && proto !== "https:") return;
    const r = (coepCredentialless && req.mode === "no-cors")
      ? new Request(req, { credentials: "omit" })
      : req;
    event.respondWith(
      fetch(r).then(resp => {
        if (resp.status === 0) return resp;
        const h = new Headers(resp.headers);
        h.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
        if (!coepCredentialless) h.set("Cross-Origin-Resource-Policy", "cross-origin");
        h.set("Cross-Origin-Opener-Policy", "same-origin");
        return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
      }).catch(err => {
        // DDC patch: ritorna una vera Response invece di undefined,
        // per evitare il TypeError "Failed to convert value to 'Response'".
        console.warn("[COI SW] fetch error:", err && err.message);
        return new Response(null, { status: 502, statusText: "Bad Gateway" });
      })
    );
  });
} else {
  // Lato pagina: non facciamo l'auto-register qui. Ci pensa il bootstrap
  // inline iniettato da build-standalone.py (più affidabile, single-reload).
}
