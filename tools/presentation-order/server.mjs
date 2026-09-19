// 発表順抽選アプリのサーバー（依存パッケージなし・Node 18+）
// 使い方は同じフォルダの README.md を参照
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ---- ここを書き換えると大画面の表示が変わる -------------------------------
const CONFIG = {
  capacity: Number(process.env.TEAMS) || 8, // 参加チーム数
  time: '15:25', // 発表開始時刻（右上と左上ラベルに出る）
  note: '1チーム 発表3分以内＋審査員の質疑応答2分以内。1分前と終了をベルでお知らせします',
};
// ---------------------------------------------------------------------------

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(DIR, 'public');
const STATE_FILE = path.join(DIR, 'state.json');
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const NAME_MAX = 24;
const MIN_TEAMS = 2; // 定員に満たなくても、これだけそろえば抽選できる

// 状態はファイルにも保存し、サーバーを再起動してもエントリーが消えないようにする
let state = loadState();
saveState(); // ホスト用 key を初回から保存し、再起動しても大画面のURLが変わらないようにする
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (s && Array.isArray(s.teams)) return s;
  } catch {}
  return {
    hostKey: process.env.HOST_KEY || crypto.randomBytes(4).toString('hex'),
    phase: 'lobby', // lobby → drawing → done
    teams: [], // { token, name }
    order: null, // teams の添字の並び（発表順）
    drawId: 0,
  };
}
function saveState() {
  fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), () => {});
}

// ---- SSE -------------------------------------------------------------------
const clients = new Set(); // { res, host, token }

function viewFor(client) {
  const showOrder = state.order && (state.phase === 'done' || client.host || client.screen);
  const v = {
    phase: state.phase,
    capacity: CONFIG.capacity,
    time: CONFIG.time,
    note: CONFIG.note,
    teams: state.teams.map((t) => t.name),
    order: showOrder ? state.order.map((i) => state.teams[i].name) : null,
    drawId: state.drawId,
  };
  if (!client.host && !client.screen) {
    const i = state.teams.findIndex((t) => t.token === client.token);
    v.you = i < 0 ? null : { no: i + 1, name: state.teams[i].name };
  }
  return v;
}
function send(client) {
  client.res.write(`data: ${JSON.stringify(viewFor(client))}\n\n`);
}
function broadcast() {
  saveState();
  for (const c of clients) send(c);
}
setInterval(() => {
  for (const c of clients) c.res.write(': ping\n\n');
}, 20000);

// ---- helpers ---------------------------------------------------------------
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 4096) reject(new Error('too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
function cleanName(raw) {
  const name = String(raw ?? '')
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '') // 制御文字を除く
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return { error: 'チーム名を入力してください' };
  if ([...name].length > NAME_MAX) return { error: `チーム名は${NAME_MAX}文字以内にしてください` };
  return { name };
}
function nameTaken(name, exceptToken) {
  const key = name.toLowerCase();
  return state.teams.some((t) => t.token !== exceptToken && t.name.toLowerCase() === key);
}
function isHost(key) {
  return typeof key === 'string' && key === state.hostKey;
}
function shuffledIndexes(n) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function lanAddresses() {
  const out = [];
  for (const [ifname, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      // 会場Wi-Fiらしいアドレスを先頭に。仮想アダプタ（WSL・Hyper-V 等）や VPN（Tailscale の 100.x 等）は後ろに回す
      const virtual = /vethernet|virtual|vmware|vbox|wsl|docker|loopback|tailscale|zerotier/i.test(ifname);
      const privateLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address);
      out.push({ address: a.address, rank: (virtual ? 2 : 0) + (privateLan ? 0 : 1) });
    }
  }
  return out.sort((a, b) => a.rank - b.rank).map((a) => a.address);
}
function joinUrls() {
  if (PUBLIC_URL) return [PUBLIC_URL + '/'];
  return lanAddresses().map((ip) => `http://${ip}:${PORT}/`);
}

const STATIC = {
  '/': ['join.html', 'text/html'],
  '/host': ['host.html', 'text/html'],
  '/screen': ['host.html', 'text/html'], // 閲覧専用の公開大画面（key 不要・操作不可）
  '/common.css': ['common.css', 'text/css'],
  '/live.js': ['live.js', 'text/javascript'],
};

// ---- routes ----------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  try {
    if (req.method === 'GET' && p === '/events') {
      res.writeHead(200, {
        // charset を付けると cloudflared（トンネル）が SSE と認識せず、溜め込んでしまう
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry: 2000\n\n');
      const client = { res, host: isHost(url.searchParams.get('key')), screen: url.searchParams.has('screen'), token: url.searchParams.get('token') };
      clients.add(client);
      send(client);
      req.on('close', () => clients.delete(client));
      return;
    }

    // SSE が通らない環境向けのポーリング用
    if (req.method === 'GET' && p === '/api/state') {
      const client = { host: isHost(url.searchParams.get('key')), screen: url.searchParams.has('screen'), token: url.searchParams.get('token') };
      return json(res, 200, viewFor(client));
    }
    if (p === '/favicon.ico') {
      res.writeHead(204);
      return res.end();
    }
    if (req.method === 'GET' && STATIC[p]) {
      if (p === '/host' && !isHost(url.searchParams.get('key'))) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('ホスト画面のURL（key）が違います。サーバー起動時に表示されたURLを開いてください。');
      }
      const [file, type] = STATIC[p];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(PUBLIC_DIR, file)).pipe(res);
    }

    if (req.method !== 'POST') return json(res, 404, { error: 'not found' });
    const body = await readBody(req);

    // ---- 参加者（スマホ） ----
    if (p === '/api/register') {
      if (state.phase !== 'lobby') return json(res, 409, { error: '抽選が始まったため変更できません' });
      const { name, error } = cleanName(body.name);
      if (error) return json(res, 400, { error });
      const mine = state.teams.find((t) => t.token && t.token === body.token);
      if (nameTaken(name, mine?.token)) return json(res, 409, { error: 'そのチーム名はすでにエントリーされています' });
      if (mine) {
        mine.name = name;
        broadcast();
        return json(res, 200, { token: mine.token, name });
      }
      if (state.teams.length >= CONFIG.capacity) return json(res, 409, { error: `定員（${CONFIG.capacity}チーム）に達しています` });
      const token = crypto.randomBytes(12).toString('hex');
      state.teams.push({ token, name });
      broadcast();
      return json(res, 200, { token, name });
    }
    if (p === '/api/leave') {
      if (state.phase !== 'lobby') return json(res, 409, { error: '抽選が始まったため取り消せません' });
      state.teams = state.teams.filter((t) => t.token !== body.token);
      broadcast();
      return json(res, 200, { ok: true });
    }

    // ---- 抽選の開始・演出終了（公開大画面 /screen からも押せるので key 不要） ----
    // 定員に満たなくても MIN_TEAMS 以上そろっていれば開始できる。二重に押されても 1 回しか抽選しない
    if (p === '/api/start') {
      if (state.phase !== 'lobby') return json(res, 409, { error: 'すでに抽選済みです' });
      if (state.teams.length < MIN_TEAMS) return json(res, 409, { error: `エントリーが${MIN_TEAMS}チーム以上必要です` });
      state.order = shuffledIndexes(state.teams.length);
      state.phase = 'drawing';
      state.drawId += 1;
      broadcast();
      return json(res, 200, { ok: true });
    }
    // 大画面の演出が終わったら、スマホにも結果を出す
    if (p === '/api/finish') {
      if (state.phase === 'drawing' && body.drawId === state.drawId) {
        state.phase = 'done';
        broadcast();
      }
      return json(res, 200, { ok: true });
    }

    // 公開大画面の「クリア」ボタン：エントリーも結果も消して最初の状態に戻す
    if (p === '/api/reset') {
      state.phase = 'lobby';
      state.order = null;
      state.teams = [];
      broadcast();
      return json(res, 200, { ok: true });
    }

    // ---- ホスト（大画面） ----
    if (!p.startsWith('/api/host/')) return json(res, 404, { error: 'not found' });
    if (!isHost(body.key)) return json(res, 403, { error: 'forbidden' });

    if (p === '/api/host/info') {
      return json(res, 200, { joinUrls: joinUrls() });
    }
    if (p === '/api/host/add') {
      if (state.phase !== 'lobby') return json(res, 409, { error: '抽選中は追加できません' });
      const { name, error } = cleanName(body.name);
      if (error) return json(res, 400, { error });
      if (nameTaken(name)) return json(res, 409, { error: 'そのチーム名はすでにエントリーされています' });
      if (state.teams.length >= CONFIG.capacity) return json(res, 409, { error: '定員に達しています' });
      state.teams.push({ token: null, name });
      broadcast();
      return json(res, 200, { ok: true });
    }
    if (p === '/api/host/remove') {
      if (state.phase !== 'lobby') return json(res, 409, { error: '抽選中は削除できません' });
      state.teams.splice(Number(body.index), 1);
      broadcast();
      return json(res, 200, { ok: true });
    }
    if (p === '/api/host/reset') {
      state.phase = 'lobby';
      state.order = null;
      if (!body.keepTeams) state.teams = [];
      broadcast();
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 400, { error: 'bad request' });
  }
});

server.listen(PORT, () => {
  const line = '─'.repeat(60);
  console.log(line);
  console.log(' 発表順抽選サーバーを起動しました');
  console.log(line);
  console.log(` 大画面（このPCのブラウザで開く）:`);
  console.log(`   http://localhost:${PORT}/host?key=${state.hostKey}`);
  console.log(` スマホ（大画面にQRコードが出ます）:`);
  for (const u of joinUrls()) console.log(`   ${u}`);
  console.log(` 公開大画面（閲覧専用・だれでも見られる）:`);
  for (const u of joinUrls()) console.log(`   ${u}screen`);
  console.log(line);
  console.log(' 止めるときは Ctrl+C');
});
