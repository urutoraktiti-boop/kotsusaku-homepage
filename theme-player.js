/* ============================================================================
   記念テーマ曲プレーヤー「軌跡は、咲く。」
   ----------------------------------------------------------------------------
   使い方：置きたい場所に空の要素を1つ書くだけ。中身はこのファイルが組み立てます。

       <div data-theme-player></div>

   ■ 音を伴う自動再生はブラウザ（Chrome / Safari / Firefox）が禁止しています。
     そのため必ず再生ボタンを起点にします。規制を迂回する実装はしません。

   ■ audio は preload="none" です。再生ボタンが押されるまで音源（約4.4MB）を
     ダウンロードしないため、聴かない訪問者に通信の負担がかかりません。
   ============================================================================ */
(function () {
  'use strict';

  var SRC      = './55555-theme.mp3';
  var COVER    = './55555-theme-cover.jpg';
  var TITLE    = '軌跡は、咲く。';
  var KICKER   = '55,555時間 記念テーマ曲';
  var VOL_KEY  = 'tp_vol_v1';      // 音量はページを越えて覚える
  var POS_KEY  = 'tp_pos_v1';      // 再生位置はタブを閉じるまで覚える
  // preload="none" のため、押されるまで実際の長さが分からない。
  // 曲の実測値を初期表示に使い、読み込めたら本物の値で置き換える。
  var KNOWN_DURATION = 190;

  function two(n){ return (n < 10 ? '0' : '') + n; }
  function clock(sec){
    if (!isFinite(sec) || sec < 0) return '--:--';
    sec = Math.floor(sec);
    return Math.floor(sec / 60) + ':' + two(sec % 60);
  }

  function injectCss(){
    if (document.getElementById('tp-style')) return;
    var css = [
      '.tp-card{display:flex;gap:clamp(14px,3vw,22px);align-items:center;',
        'background:rgba(255,255,255,.72);border:1.5px solid rgba(255,255,255,.9);',
        'border-radius:26px;padding:clamp(16px,3vw,22px);backdrop-filter:blur(14px);',
        'box-shadow:0 18px 44px rgba(219,39,119,.14);max-width:620px;margin-inline:auto;}',
      '.tp-cover{width:clamp(96px,20vw,132px);height:clamp(96px,20vw,132px);border-radius:18px;',
        'object-fit:cover;flex-shrink:0;box-shadow:0 8px 20px rgba(30,27,75,.2);}',
      '.tp-body{flex:1;min-width:0;text-align:left;}',
      '.tp-kicker{font-size:10.5px;font-weight:900;letter-spacing:.14em;color:#db2777;margin:0 0 4px;}',
      '.tp-title{font-family:"Noto Serif JP",serif;font-weight:900;font-size:clamp(17px,2.6vw,22px);',
        'margin:0 0 12px;line-height:1.35;color:#1e1b4b;}',
      '.tp-row{display:flex;align-items:center;gap:10px;}',
      '.tp-play{width:46px;height:46px;flex-shrink:0;border:none;border-radius:50%;cursor:pointer;',
        'background:linear-gradient(135deg,#db2777,#9333ea);box-shadow:0 6px 18px rgba(219,39,119,.36);',
        'position:relative;transition:transform .14s;padding:0;}',
      '.tp-play:hover{transform:scale(1.07);}',
      '.tp-play::before{content:"";position:absolute;top:50%;left:53%;transform:translate(-50%,-50%);',
        'border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent #fff;}',
      '.tp-play.is-playing::before{border:none;width:12px;height:14px;left:50%;',
        'background:linear-gradient(90deg,#fff 0 4px,transparent 4px 8px,#fff 8px 12px);}',
      '.tp-seek,.tp-vol{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;',
        'background:rgba(219,39,119,.16);cursor:pointer;outline-offset:4px;}',
      '.tp-seek{flex:1;min-width:0;}',
      '.tp-vol{width:82px;flex-shrink:0;}',
      '.tp-seek::-webkit-slider-thumb,.tp-vol::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;',
        'width:15px;height:15px;border-radius:50%;background:#db2777;border:2px solid #fff;',
        'box-shadow:0 2px 6px rgba(219,39,119,.45);cursor:pointer;}',
      '.tp-seek::-moz-range-thumb,.tp-vol::-moz-range-thumb{width:13px;height:13px;border-radius:50%;',
        'background:#db2777;border:2px solid #fff;cursor:pointer;}',
      '.tp-time{font-size:11.5px;font-weight:800;color:#6b7280;font-variant-numeric:tabular-nums;',
        'white-space:nowrap;flex-shrink:0;}',
      '.tp-foot{display:flex;align-items:center;gap:8px;margin-top:10px;}',
      '.tp-foot-label{font-size:10.5px;font-weight:800;color:#6b7280;flex-shrink:0;}',
      '.tp-note{font-size:11px;color:#6b7280;margin:12px 0 0;text-align:center;}',
      '@media(max-width:520px){',
        '.tp-card{flex-direction:column;text-align:center;}',
        '.tp-body{text-align:center;width:100%;}',
        '.tp-cover{width:150px;height:150px;}',
        '.tp-foot{justify-content:center;}',   // 音量行だけ左に残らないように
      '}',
      '@media(prefers-reduced-motion:reduce){.tp-play{transition:none;}.tp-play:hover{transform:none;}}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'tp-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function build(host){
    var card = document.createElement('div');
    card.className = 'tp-card';

    var cover = document.createElement('img');
    cover.className = 'tp-cover';
    cover.src = COVER;
    cover.alt = TITLE + ' のジャケット';
    cover.loading = 'lazy';
    cover.addEventListener('error', function(){ cover.remove(); });

    var body = document.createElement('div');
    body.className = 'tp-body';

    var kicker = document.createElement('p');
    kicker.className = 'tp-kicker';
    kicker.textContent = KICKER;

    var title = document.createElement('p');
    title.className = 'tp-title';
    title.textContent = TITLE;

    var row = document.createElement('div');
    row.className = 'tp-row';

    var play = document.createElement('button');
    play.className = 'tp-play';
    play.type = 'button';
    play.setAttribute('aria-label', TITLE + ' を再生');
    play.setAttribute('aria-pressed', 'false');

    var seek = document.createElement('input');
    seek.className = 'tp-seek';
    seek.type = 'range';
    seek.min = 0; seek.max = 1000; seek.value = 0; seek.step = 1;
    seek.setAttribute('aria-label', '再生位置');

    var time = document.createElement('span');
    time.className = 'tp-time';
    time.textContent = '0:00 / ' + clock(KNOWN_DURATION);

    row.appendChild(play); row.appendChild(seek); row.appendChild(time);

    var foot = document.createElement('div');
    foot.className = 'tp-foot';
    var volLabel = document.createElement('span');
    volLabel.className = 'tp-foot-label';
    volLabel.textContent = '音量';
    var vol = document.createElement('input');
    vol.className = 'tp-vol';
    vol.type = 'range';
    vol.min = 0; vol.max = 100; vol.step = 1;
    vol.setAttribute('aria-label', '音量');
    foot.appendChild(volLabel); foot.appendChild(vol);

    var audio = document.createElement('audio');
    audio.preload = 'none';        // 押されるまで音源を取りに行かない
    audio.loop = true;
    audio.src = SRC;

    body.appendChild(kicker); body.appendChild(title);
    body.appendChild(row); body.appendChild(foot);
    card.appendChild(cover); card.appendChild(body); card.appendChild(audio);

    var note = document.createElement('p');
    note.className = 'tp-note';
    note.textContent = '再生ボタンを押すまで、音源は読み込まれません。';

    host.textContent = '';
    host.appendChild(card);
    host.appendChild(note);

    return { audio:audio, play:play, seek:seek, time:time, vol:vol };
  }

  function wire(el){
    var audio = el.audio, seeking = false;

    // ── 音量（ページを越えて覚える） ──
    var saved = parseFloat(localStorage.getItem(VOL_KEY));
    var v = isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.7;
    audio.volume = v;
    el.vol.value = Math.round(v * 100);
    el.vol.addEventListener('input', function(){
      audio.volume = el.vol.value / 100;
      try { localStorage.setItem(VOL_KEY, String(audio.volume)); } catch(e){}
    });

    function paint(){
      var d = audio.duration;
      var shown = isFinite(d) && d > 0 ? d : KNOWN_DURATION;
      el.time.textContent = clock(audio.currentTime) + ' / ' + clock(shown);
      if (!seeking && isFinite(d) && d > 0) {
        el.seek.value = Math.round((audio.currentTime / d) * 1000);
      }
    }

    audio.addEventListener('loadedmetadata', paint);
    audio.addEventListener('timeupdate', paint);

    audio.addEventListener('play', function(){
      el.play.classList.add('is-playing');
      el.play.setAttribute('aria-pressed', 'true');
      el.play.setAttribute('aria-label', TITLE + ' を一時停止');
    });
    audio.addEventListener('pause', function(){
      el.play.classList.remove('is-playing');
      el.play.setAttribute('aria-pressed', 'false');
      el.play.setAttribute('aria-label', TITLE + ' を再生');
      remember();
    });

    el.play.addEventListener('click', function(){
      if (audio.paused) audio.play().catch(function(){ /* 再生できない環境では何もしない */ });
      else audio.pause();
    });

    // ── シーク ──
    el.seek.addEventListener('input', function(){ seeking = true; });
    el.seek.addEventListener('change', function(){
      var d = audio.duration;
      if (isFinite(d) && d > 0) audio.currentTime = (el.seek.value / 1000) * d;
      seeking = false;
    });

    // ── ページ移動をまたいだ続き ──
    // 通常のHTMLサイトでは再生を引き継げないため、位置と再生中フラグを覚えておき、
    // 移動先で続きから再生を試みる。ブラウザに断られたら黙って再生ボタンで待つ。
    function remember(){
      try {
        sessionStorage.setItem(POS_KEY, JSON.stringify({
          t: audio.currentTime || 0,
          playing: !audio.paused
        }));
      } catch(e){}
    }
    setInterval(function(){ if (!audio.paused) remember(); }, 5000);
    window.addEventListener('pagehide', remember);

    var prev = null;
    try { prev = JSON.parse(sessionStorage.getItem(POS_KEY) || 'null'); } catch(e){}
    if (prev && prev.playing) {
      var seekOnce = function(){
        if (prev.t > 0 && isFinite(audio.duration)) audio.currentTime = Math.min(prev.t, audio.duration - 0.5);
        audio.removeEventListener('loadedmetadata', seekOnce);
      };
      audio.addEventListener('loadedmetadata', seekOnce);
      audio.play().catch(function(){
        // 自動再生を許可されなかった場合。エラーは出さず、再生ボタンの状態で待つ。
        audio.removeEventListener('loadedmetadata', seekOnce);
      });
    }
  }

  function init(){
    var hosts = document.querySelectorAll('[data-theme-player]');
    if (!hosts.length) return;
    injectCss();
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i].dataset.tpReady) continue;
      hosts[i].dataset.tpReady = '1';
      wire(build(hosts[i]));
    }
  }

  // 記念ページは到達後にプレーヤーを差し込むため、あとからでも組み立てられるよう公開する
  window.themePlayerInit = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
