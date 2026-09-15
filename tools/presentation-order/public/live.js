// サーバーの状態を受け取り続ける。
// まず SSE でつなぎ、届かない環境（Cloudflare の一時トンネル等）では 1 秒ごとのポーリングに切り替える。
// 内容が前回と同じなら onData は呼ばない。
function subscribeState(query, onData, onStatus) {
  let last = '';
  let es = null;
  let timer = null;
  let stopped = false;
  let gotSse = false;
  let keepAlive = null;

  function handle(text) {
    onStatus(true);
    if (text === last) return;
    last = text;
    onData(JSON.parse(text));
  }

  function startPolling() {
    if (es) { es.close(); es = null; }
    const tick = async () => {
      if (stopped) return;
      try {
        const r = await fetch('/api/state?' + query, { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        handle(await r.text());
      } catch {
        onStatus(false);
      }
      timer = setTimeout(tick, 1000);
    };
    tick();
  }

  // SSE を待たずに、まず今の状態を 1 回取って画面を出す
  fetch('/api/state?' + query, { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((text) => { if (!stopped && !gotSse) handle(text); })
    .catch(() => {});

  es = new EventSource('/events?' + query);
  es.onmessage = (e) => { gotSse = true; handle(e.data); };
  es.onerror = () => { if (gotSse) onStatus(false); };
  setTimeout(() => { if (!gotSse && !stopped) startPolling(); }, 4000);

  // Render の無料枠は一定時間リクエストが来ないとスリープし、エントリー内容が消える。
  // SSE の ping はサーバーから送るだけでリクエストにならないので、画面が開いている間は定期的に叩いておく。
  keepAlive = setInterval(() => {
    if (!stopped) fetch('/api/state?' + query, { cache: 'no-store' }).catch(() => {});
  }, 240000);

  return () => {
    stopped = true;
    if (es) es.close();
    clearTimeout(timer);
    clearInterval(keepAlive);
  };
}
