/* ============================================================================
   ゴリラ・フェス — 55,555時間達成 記念モード
   ----------------------------------------------------------------------------
   お祭りの ON / OFF は、すぐ下の GORIFEST だけで切り替わります。

     on    : false にすると、このファイルは何もしません。
             サイトの見た目は記念仕様を入れる前と完全に同一に戻ります。
     until : 'YYYY-MM-DD'。この日を過ぎたら自動でお祭り終了。
             null にすると期限なし（on が true の間ずっとお祭り）。

   お祭りを終わらせたいときは on を false にするだけです。
   HTML 側を触る必要はありません。
   ============================================================================ */
var GORIFEST = { on: true, until: '2026-10-31' };


(function () {
  'use strict';

  // ── お祭り開催中か判定 ───────────────────────────────────────────────
  function isFestOn() {
    if (!GORIFEST || !GORIFEST.on) return false;
    if (GORIFEST.until) {
      var end = new Date(GORIFEST.until + 'T23:59:59');
      if (!isNaN(end.getTime()) && Date.now() > end.getTime()) return false;
    }
    return true;
  }

  var ON = isFestOn();
  window.GORIFEST_ON = ON;

  // ── OFF のときに備えた素通しAPI ────────────────────────────────────
  // HTML 側はこれらを経由して絵文字を扱うので、OFF なら元の値がそのまま返る。
  window.gori       = function (s) { return s; };      // 文字列の先頭アイコンを差し替え
  window.goriIcons  = function (a) { return a; };      // 絵文字配列を差し替え
  window.goriRunner = function (s) { return s; };      // ランナー帯の並びを差し替え

  // ── 画像が未配置のキャラ枠を片付ける ────────────────────────────────
  // Gorigogo.png / GoriWoo.png がまだ無い間は、壊れた画像を出さずに
  // カード（とカルーセルのドット1つ）ごと消す。お祭りの ON/OFF とは無関係に必要。
  window.goriDropChar = function (img) {
    var card = img.closest ? img.closest('.char-card') : null;
    if (card) {
      card.remove();
      var dot = document.querySelector('#carousel-dots .carousel-dot:last-child');
      if (dot) dot.remove();
      return;
    }
    var host = img.closest ? img.closest('.gori-peek') : null;
    (host || img).remove();
  };

  if (!ON) return;   // ここで終了 ＝ DOM も favicon も一切触らない

  document.documentElement.setAttribute('data-gorifest', 'on');


  /* ==========================================================================
     アイコン設定
     ========================================================================== */

  // 層A：飾りアイコン用のゴリラ族プール（ランダム／繰り返しで使う）
  var CLAN = ['🦍', '🍌', '🌴', '🥁', '💪', '🥥'];

  // 層B：並びで見分けるアイコン用。位置ごとに別々の絵柄を割り当てる
  var JUNGLE = ['🦍', '🍌', '🌴', '🥥', '🥁', '💪', '🪵', '🍃', '🥭', '🌿', '🐾', '🌋'];

  // 層C：絶対に触らないアイコン
  //   🌸  … ブランドの根幹（サクサク＝桜）かつ「10分＝🌸1個」の単位
  //   🥸  … C_uemak 本人。ランナー帯のフリーズ演出も この絵文字で判定している
  //   🥦⚔️🚀🐉🦍 … ストーリー識別。アプリ側のデータと一致している必要がある
  //   😏  … ニヤボタンのアイデンティティ
  //   ✅🔒🛡🧪 … 意味そのものがアイコンになっているもの
  var KEEP = ['🌸', '🥸', '🥦', '⚔️', '🚀', '🐉', '🦍', '😏', '✅', '🔒', '🛡', '🧪'];

  // 先頭の絵文字を1つ取り出す正規表現（異体字セレクタ・ZWJ結合に対応）
  var LEAD_EMOJI;
  try {
    LEAD_EMOJI = new RegExp(
      '^\\s*(\\p{Extended_Pictographic}\\uFE0F?(?:\\u200D\\p{Extended_Pictographic}\\uFE0F?)*)',
      'u'
    );
  } catch (e) {
    // \p{...} 非対応ブラウザ：この環境ではアイコン置換だけ静かに諦める
    LEAD_EMOJI = null;
  }

  // 異体字セレクタ（U+FE0F）の有無だけが違うものは同じ絵文字として扱う。
  // ※ charAt(0) での比較は不可：🚀 と 📖 のようにサロゲートの前半が同じ絵文字が
  //    大量にあるため、無関係なアイコンまで KEEP 扱いになってしまう。
  function norm(s) { return String(s).replace(/\uFE0F/g, ''); }

  var KEEP_SET = {};
  for (var ki = 0; ki < KEEP.length; ki++) KEEP_SET[norm(KEEP[ki])] = true;

  function isKept(ch) {
    return KEEP_SET[norm(ch)] === true;
  }

  /* --------------------------------------------------------------------------
     置換ルール
       sel  : 対象のセレクタ
       mode : 'seq'  … JUNGLE から順番に別々の絵柄を割り当てる（並びを見分けたい枠）
              'clan' … CLAN からローテーションで割り当てる（純粋な飾り枠）
              'pre'  … 元のアイコンは残したまま 🦍 を前に添える（意味を壊したくない枠）
       icons: mode が 'seq' / 'clan' のときに使うプール（省略時は既定）
     --------------------------------------------------------------------------
     ここに書いていない要素は一切触りません。
     「これも変えたい／これは戻したい」はこの表だけで調整できます。
     -------------------------------------------------------------------------- */
  var RULES = [
    // ── 共通ナビ ──
    { sel: '.nav-links a',           mode: 'seq'  },

    // ── index.html ──
    { sel: '.dialect-btn',           mode: 'seq'  },
    { sel: '.chart-title',           mode: 'seq'  },
    { sel: '.data-policy-item-icon', mode: 'seq'  },
    { sel: '.kotsu-step-icon',       mode: 'clan' },
    { sel: '.kotsu-pill',            mode: 'seq'  },
    { sel: '.ticker-item',           mode: 'clan' },

    // ── manual.html ──
    { sel: '.hero-badge',            mode: 'seq'  },
    { sel: '.toc-emoji',             mode: 'seq'  },
    // .f-icon / .b-icon / .story-icon / .theme-name / レベル表のアイコンは
    // アプリ内の表示と対応した「説明のためのアイコン」なので置換しない。
    // 代わりに見出しへゴリラを添えて、お祭り感だけ出す。
    { sel: '.sec-title',             mode: 'pre'  },

    // ── kotsu-habit.html ──
    { sel: '.toc-item',              mode: 'seq'  },
    { sel: '.feature-icon',          mode: 'seq'  },
    { sel: '.rank-icon',             mode: 'seq'  },
    { sel: '.future-pill',           mode: 'seq'  },
    { sel: '.ability-emoji',         mode: 'clan' },

    // ── install.html ──
    // 手順の図解アイコン（.mock-highlight-icon）は「どこを押すか」の説明そのもの
    // なので触らない。見出しにゴリラを添えるだけにする。
    { sel: '.steps-title',           mode: 'pre'  },
    { sel: '.done-title',            mode: 'pre'  }
  ];


  /* ==========================================================================
     置換の実行
     ========================================================================== */

  // 要素の先頭にある絵文字を差し替える（テキストノードだけを触る）
  function swapLead(el, icon) {
    if (!LEAD_EMOJI) return false;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var m = node.nodeValue.match(LEAD_EMOJI);
      if (!m) {
        if (node.nodeValue.trim() !== '') return false;  // 絵文字以外の文字が先に来た
        continue;
      }
      if (isKept(m[1])) return false;
      node.nodeValue = node.nodeValue.replace(m[1], icon);
      return true;
    }
    return false;
  }

  // 要素の先頭にゴリラを添える（元のアイコンは残す）
  function prependGori(el) {
    if (el.querySelector('.gori-pre')) return;
    var badge = document.createElement('span');
    badge.className = 'gori-pre';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = '🦍 ';
    el.insertBefore(badge, el.firstChild);
  }

  function applyRule(rule, root) {
    var els;
    try { els = root.querySelectorAll(rule.sel); } catch (e) { return; }
    var pool = rule.icons || (rule.mode === 'clan' ? CLAN : JUNGLE);
    var hit = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('[data-gori-keep]')) continue;
      if (el.getAttribute('data-gori-done')) continue;
      // 入れ子対策：内側の要素（例 .toc-item > .toc-emoji）を既に処理済みなら、
      // 外側のルールで二重に置換しない
      if (el.querySelector('[data-gori-done]')) continue;

      if (rule.mode === 'pre') {
        prependGori(el);
        el.setAttribute('data-gori-done', '1');
        continue;
      }
      // アイコンを持つ要素だけを数えて割り当てる（持たない要素で番号がずれないように）
      if (swapLead(el, pool[hit % pool.length])) {
        hit++;
        el.setAttribute('data-gori-done', '1');
      }
    }
  }

  function applyAll(root) {
    root = root || document;
    for (var i = 0; i < RULES.length; i++) applyRule(RULES[i], root);
  }


  /* ==========================================================================
     HTML 側から呼ばれるAPI（お祭り ON のときの実装）
     ========================================================================== */

  // 文字列の先頭アイコンをゴリラ族に差し替える（応援メッセージなどに使う）
  var goriSeq = 0;
  window.gori = function (s) {
    if (typeof s !== 'string' || !LEAD_EMOJI) return s;
    var m = s.match(LEAD_EMOJI);
    if (!m || isKept(m[1])) return s;
    return s.replace(m[1], CLAN[goriSeq++ % CLAN.length]);
  };

  // 絵文字配列をまるごとゴリラ族に差し替える（カーソル足跡など）
  window.goriIcons = function (arr) {
    return CLAN.slice();
  };

  // ランナー帯：元の顔ぶれは残したまま、ゴリラを増員する。
  // （🥸 のフリーズ演出と、方言吹き出しの絵文字キーを壊さないため置換はしない）
  window.goriRunner = function (s) {
    var chars = String(s || '').split(' ').filter(Boolean);
    var out = [];
    for (var i = 0; i < chars.length; i++) {
      out.push('🦍');
      out.push(chars[i]);
    }
    out.push('🍌');
    return out.join(' ');
  };


  /* ==========================================================================
     バナナカウンター
     「10分＝🌸1個」と同じ数を🍌に換算して並べて出す。
     ゴリラは1日およそ30本のバナナを食べるので、その頭数も添える。
     ========================================================================== */
  window.goriBanana = function (sakuraCount) {
    var el = document.getElementById('gori-banana');
    if (!el) return;
    var n = Math.max(0, Number(sakuraCount) || 0);
    var heads = Math.floor(n / 30);
    el.innerHTML = '🍌 <b>' + n.toLocaleString() + '</b> 本' +
                   '<span>　＝ ゴリラ ' + heads.toLocaleString() + ' 頭の1日分ゴリ</span>';
  };


  /* ==========================================================================
     コンフェッティ（バナナと金テープ）
     index.html のイースターエッグと記念スタンプラリーの両方から使う
     ========================================================================== */
  var BURST_ICONS = ['🍌', '🦍', '🥁', '🌴', '💪', '🥥'];

  window.goriBurst = function (count) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var n = count || 46;
    for (var i = 0; i < n; i++) {
      (function (i) {
        setTimeout(function () {
          var el = document.createElement('div');
          el.className = 'gori-confetti';
          el.setAttribute('aria-hidden', 'true');
          el.textContent = BURST_ICONS[Math.floor(Math.random() * BURST_ICONS.length)];
          var dur   = 2.6 + Math.random() * 2.0;
          var drift = (Math.random() - 0.5) * 260;
          var spin  = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540);
          el.style.left     = (Math.random() * 100) + 'vw';
          el.style.fontSize = (16 + Math.random() * 30) + 'px';
          document.body.appendChild(el);
          el.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: 'translate(' + drift + 'px,110vh) rotate(' + spin + 'deg)', opacity: 0 }
          ], { duration: dur * 1000, easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'forwards' });
          setTimeout(function () { el.remove(); }, dur * 1000 + 200);
        }, i * 45);
      })(i);
    }
  };


  /* ==========================================================================
     記念スタンプラリー
     4ページすべてを訪れると隠しゴリラが出る。進捗は localStorage に保存。
     ========================================================================== */
  var STAMP_KEY   = 'gori_stamp_v1';
  var STAMP_PAGES = [
    { id: 'index',       file: 'index.html',       label: 'トップ' },
    { id: 'manual',      file: 'manual.html',      label: '使い方' },
    { id: 'kotsu-habit', file: 'kotsu-habit.html', label: 'コツ習慣' },
    { id: 'install',     file: 'install.html',     label: '追加方法' }
  ];

  function stampLoad() {
    try {
      var raw = localStorage.getItem(STAMP_KEY);
      var o = raw ? JSON.parse(raw) : {};
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function stampSave(o) {
    try { localStorage.setItem(STAMP_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function currentPageId() {
    var f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (f === '' || f === '/') f = 'index.html';
    for (var i = 0; i < STAMP_PAGES.length; i++) {
      if (STAMP_PAGES[i].file === f) return STAMP_PAGES[i].id;
    }
    return null;
  }

  function initStampRally() {
    var here = currentPageId();
    if (!here) return;                     // 対象外のページでは何も出さない

    var state = stampLoad();
    state[here] = 1;
    stampSave(state);

    var got = STAMP_PAGES.filter(function (p) { return state[p.id]; }).length;
    var all = got === STAMP_PAGES.length;

    // ── パネル本体 ──
    var box = document.createElement('div');
    box.className = 'gori-stamp' + (all ? ' is-complete' : '');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gori-stamp-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span aria-hidden="true">🦍</span> スタンプ <b>' +
                    got + '/' + STAMP_PAGES.length + '</b>';

    var list = document.createElement('div');
    list.className = 'gori-stamp-list';
    list.hidden = true;
    var html = '<div class="gori-stamp-head">記念スタンプラリー</div>';
    STAMP_PAGES.forEach(function (p) {
      var done = !!state[p.id];
      html += '<div class="gori-stamp-row' + (done ? ' done' : '') + '">' +
              '<span class="gori-stamp-mark" aria-hidden="true">' + (done ? '🦍' : '・') + '</span>' +
              (done || p.id === here
                ? '<span>' + p.label + '</span>'
                : '<a href="./' + p.file + '">' + p.label + '</a>') +
              '</div>';
    });
    html += '<div class="gori-stamp-foot">' +
            (all ? '全部そろったゴリ！ありがとうゴリ 🍌'
                 : '4ページぜんぶ回ると、なにか起きるゴリ') + '</div>';
    list.innerHTML = html;

    btn.addEventListener('click', function () {
      var open = list.hidden;
      list.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });

    box.appendChild(btn);
    box.appendChild(list);
    document.body.appendChild(box);

    // ── 4枚そろった瞬間の演出（1回だけ）──
    if (all && !state._done) {
      state._done = 1;
      stampSave(state);
      setTimeout(function () {
        list.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        box.classList.add('is-celebrating');
        window.goriBurst(60);
        // index.html には全画面ゴリラ演出があるのでそちらを使う
        if (window.goriFireEasterEgg) setTimeout(window.goriFireEasterEgg, 500);
      }, 900);
    }
  }

  // スタンプラリーのCSS（4ページ共通なのでJSから注入する）
  function injectStampCss() {
    var css = [
      // コンフェッティは index.html 以外にもスタンプラリーから飛ぶので共通で定義する
      '.gori-confetti{position:fixed;top:-40px;z-index:9998;pointer-events:none;user-select:none;will-change:transform;}',
      '.gori-stamp{position:fixed;right:14px;bottom:14px;z-index:9997;font-family:inherit;',
        'display:flex;flex-direction:column;align-items:flex-end;gap:6px;}',
      '.gori-stamp-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;',
        'background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;',
        'color:#92400e;font-size:12px;font-weight:900;font-family:inherit;padding:8px 14px;',
        'border-radius:999px;box-shadow:0 6px 18px rgba(146,64,14,.18);transition:transform .12s;}',
      '.gori-stamp-toggle:hover{transform:translateY(-2px);}',
      '.gori-stamp-list{background:rgba(255,255,255,.96);border:1.5px solid #fcd34d;border-radius:16px;',
        'padding:12px 14px;min-width:172px;box-shadow:0 10px 28px rgba(146,64,14,.18);',
        'backdrop-filter:blur(8px);}',
      '.gori-stamp-head{font-size:11px;font-weight:900;color:#b45309;letter-spacing:.06em;margin-bottom:8px;}',
      '.gori-stamp-row{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;',
        'color:#9ca3af;padding:2px 0;}',
      '.gori-stamp-row.done{color:#1e1b4b;}',
      '.gori-stamp-row a{color:#b45309;text-decoration:underline;font-weight:800;}',
      '.gori-stamp-mark{width:16px;text-align:center;}',
      '.gori-stamp-foot{margin-top:9px;font-size:10.5px;font-weight:800;color:#6b7280;line-height:1.6;}',
      '.gori-stamp.is-complete .gori-stamp-toggle{background:linear-gradient(135deg,#fde68a,#fbcfe8);}',
      '.gori-stamp.is-celebrating .gori-stamp-toggle{animation:goriStampPop .5s cubic-bezier(.34,1.56,.64,1) 3;}',
      '@keyframes goriStampPop{0%,100%{transform:scale(1);}50%{transform:scale(1.12);}}',
      '@media(max-width:599px){.gori-stamp{right:10px;bottom:10px;}',
        '.gori-stamp-toggle{font-size:11px;padding:7px 12px;}}',
      '@media(prefers-reduced-motion:reduce){.gori-stamp.is-celebrating .gori-stamp-toggle{animation:none;}}'
    ].join('');
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }


  /* ==========================================================================
     favicon をゴリラに差し替える
     （バイナリ不要の data-URI SVG。このサイトは元々 favicon 未設定）
     ========================================================================== */
  function setFavicon() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
              '<text x="32" y="48" font-size="52" text-anchor="middle">🦍</text></svg>';
    var href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = href;
  }


  /* ==========================================================================
     起動
     ========================================================================== */
  function boot() {
    setFavicon();
    applyAll(document);
    injectStampCss();
    initStampRally();

    // あとから描画される領域（統計・ティッカー・マイルストーン）にも追従する。
    // body 全体を監視するとカーソル足跡の生成で毎回発火してしまうため、
    // 対象は必ずこの範囲に絞る。
    if (!window.MutationObserver) return;
    var targets = ['#stats-body', '#ms-btns', '#uemakBand'];
    var obs = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) applyAll(added[j].parentNode || document);
        }
      }
    });
    for (var k = 0; k < targets.length; k++) {
      var t = document.querySelector(targets[k]);
      if (t) obs.observe(t, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
