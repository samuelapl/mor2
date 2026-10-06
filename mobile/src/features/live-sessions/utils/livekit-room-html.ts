import { LIVEKIT_CLIENT_JS } from './livekit-client-bundle';

export interface LiveKitRoomHtmlOptions {
  wsUrl: string;
  token: string;
  /** Label appended to the local tile, e.g. "You". */
  youLabel: string;
  /** Dev builds only: route media to a LiveKit server running on the dev machine. */
  devNetworkFix: boolean;
}

/**
 * The live room page rendered inside the WebView (livekit-client, same version as the web app).
 * It only renders media; every control is native and drives it through `window.eltms`, and
 * everything that happens in the room is posted back as JSON messages (see LiveKitRoom.tsx).
 *
 * Interop with the web room: chat uses LiveKit's standard `lk.chat` text streams (plus the legacy
 * `lk-chat-topic` packet), app events (quiz, hand raise) are topic-less reliable JSON packets.
 */
export function buildLiveKitRoomHtml(options: LiveKitRoomHtmlOptions): string {
  const config = JSON.stringify(options);
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #020617; color: #e2e8f0;
    font-family: -apple-system, Roboto, "Noto Sans Ethiopic", sans-serif; overflow: hidden; }
  #container { display: flex; flex-direction: column; width: 100%; height: 100%; }

  /* Screen share stage */
  #stage { display: none; position: relative; flex: 1; min-height: 0; background: #000; }
  #container.presenting #stage { display: flex; align-items: center; justify-content: center; }
  #stage video { width: 100%; height: 100%; object-fit: contain; }
  #stage-label { position: absolute; top: 10px; left: 10px; z-index: 2; padding: 4px 10px; border-radius: 999px;
    background: rgba(2, 6, 23, 0.8); color: #7dd3fc; font-size: 12px; font-weight: 600; }

  /* Camera grid */
  #grid { flex: 1; min-height: 0; display: grid; gap: 8px; padding: 8px; overflow-y: auto;
    grid-template-columns: 1fr; grid-auto-rows: minmax(0, 1fr); }
  #grid[data-count="2"] { grid-template-rows: 1fr 1fr; }
  #grid[data-count="3"], #grid[data-count="4"], #grid[data-count="5"] {
    grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(150px, 1fr); }
  #container.presenting #grid { flex: none; height: 116px; display: flex; overflow-x: auto; overflow-y: hidden;
    padding: 6px; background: #0b1120; border-top: 1px solid #1e293b; }
  #container.presenting .tile { flex: 0 0 150px; }

  .tile { position: relative; overflow: hidden; border-radius: 14px; background: #0f172a;
    border: 2px solid rgba(255, 255, 255, 0.06); transition: border-color 0.15s; }
  .tile.speaking { border-color: #22c55e; }
  .tile video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .tile video.mirror { transform: scaleX(-1); }
  .tile .avatar { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .tile.has-video .avatar { display: none; }
  .tile .avatar span { width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center;
    justify-content: center; background: #1e293b; color: #cbd5e1; font-size: 22px; font-weight: 700; }
  .tile.trainer .avatar span { background: #312e81; color: #e0e7ff; }
  .tile .label { position: absolute; left: 8px; bottom: 8px; right: 8px; display: flex; align-items: center; gap: 6px; }
  .tile .nm { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px;
    font-weight: 600; padding: 3px 8px; border-radius: 999px; background: rgba(2, 6, 23, 0.72); }
  .tile .mic { display: none; width: 20px; height: 20px; border-radius: 999px; background-color: #dc2626; flex: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M2 2l20 20M9 9v3a3 3 0 0 0 5 2.2M15 9.3V5a3 3 0 0 0-5.7-1.3M19 10v2a7 7 0 0 1-.6 2.8M5 10v2a7 7 0 0 0 11.3 5.5M12 19v3'/%3E%3C/svg%3E");
    background-size: 12px; background-position: center; background-repeat: no-repeat; }
  .tile .mic.off { display: block; }

</style>
<script>window.__LIVEKIT_CONFIG__ = ${config};</script>
<script>
(function installWebRtcAdapter() {
  var cfg = window.__LIVEKIT_CONFIG__;
  // Dev only: lets an emulator/phone reach a LiveKit server running on the dev machine.
  if (!cfg.devNetworkFix) return;
  var OrigPC = window.RTCPeerConnection;
  if (!OrigPC) return;

  var wsHost = '';
  try {
    var match = cfg.wsUrl.match(/wss?:\/\/([^:\/]+)/);
    if (match && match[1]) wsHost = match[1];
  } catch(e) {}

  function getCandidateHosts() {
    var list = [];
    if (wsHost && wsHost !== 'localhost' && wsHost !== '127.0.0.1') {
      list.push(wsHost);
    }
    if (list.indexOf('10.0.2.2') === -1) list.push('10.0.2.2');
    if (list.indexOf('127.0.0.1') === -1) list.push('127.0.0.1');
    return list;
  }

  function rewriteSdp(sdp) {
    if (!sdp || typeof sdp !== 'string') return sdp;
    var hosts = getCandidateHosts();
    var primaryHost = hosts[0] || '10.0.2.2';
    var lines = sdp.split('\r\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('c=IN IP4') === 0) {
        out.push('c=IN IP4 ' + primaryHost);
        continue;
      }
      var candMatch = line.match(/^a=candidate:(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(.*)$/);
      if (candMatch) {
        var found = candMatch[1];
        var comp = candMatch[2];
        var proto = candMatch[3];
        var prio = candMatch[4];
        var origIp = candMatch[5];
        var port = candMatch[6];
        var rest = candMatch[7];

        // Keep original candidate
        out.push(line);

        // Add candidate variants for accessible host interfaces (LAN, emulator 10.0.2.2, loopback)
        for (var h = 0; h < hosts.length; h++) {
          var targetH = hosts[h];
          if (targetH === origIp) continue;
          var fId = 'r' + targetH.replace(/[^a-zA-Z0-9]/g, '') + found;
          out.push('a=candidate:' + fId + ' ' + comp + ' ' + proto + ' ' + prio + ' ' + targetH + ' ' + port + ' ' + rest);
        }
      } else {
        out.push(line);
      }
    }
    return out.join('\r\n');
  }

  var origSetRemoteDescription = OrigPC.prototype.setRemoteDescription;
  OrigPC.prototype.setRemoteDescription = function(desc) {
    if (desc && desc.sdp) {
      try {
        var newSdp = rewriteSdp(desc.sdp);
        desc = new RTCSessionDescription({
          type: desc.type,
          sdp: newSdp
        });
      } catch(e) {
        console.warn('[WebRTC Adapter] SDP rewrite error:', e);
      }
    }
    return origSetRemoteDescription.apply(this, arguments);
  };

  var origAddIceCandidate = OrigPC.prototype.addIceCandidate;
  OrigPC.prototype.addIceCandidate = function(candidate) {
    if (candidate && candidate.candidate) {
      var cMatch = candidate.candidate.match(/^candidate:(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(.*)$/);
      if (cMatch) {
        var self = this;
        var hosts = getCandidateHosts();
        var promises = [];
        promises.push(origAddIceCandidate.apply(self, arguments).catch(function(){}));

        for (var h = 0; h < hosts.length; h++) {
          var targetH = hosts[h];
          if (targetH === cMatch[5]) continue;
          var fId = 'r' + targetH.replace(/[^a-zA-Z0-9]/g, '') + cMatch[1];
          var newCandStr = 'candidate:' + fId + ' ' + cMatch[2] + ' ' + cMatch[3] + ' ' + cMatch[4] + ' ' + targetH + ' ' + cMatch[6] + ' ' + cMatch[7];
          var newCandObj = {
            candidate: newCandStr,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
            usernameFragment: candidate.usernameFragment
          };
          try {
            promises.push(origAddIceCandidate.call(self, new RTCIceCandidate(newCandObj)).catch(function(){}));
          } catch(e) {
            promises.push(origAddIceCandidate.call(self, newCandObj).catch(function(){}));
          }
        }
        return Promise.all(promises);
      }
    }
    return origAddIceCandidate.apply(this, arguments);
  };
})();

</script>
<script>${LIVEKIT_CLIENT_JS}</script>
</head><body>
<div id="container">
  <div id="stage"><div id="stage-label"></div></div>
  <div id="grid"></div>
</div>
<script>
(function(){
  var cfg = window.__LIVEKIT_CONFIG__;
  var post = function(m){
    var d = JSON.stringify(m);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(d);
    else if (window.parent !== window) window.parent.postMessage({ eltmsRoom: d }, '*');
  };

  if (!window.LivekitClient) {
    post({ type: 'error', message: 'LiveKit client library could not be loaded' });
    return;
  }

  var LK = window.LivekitClient;
  var Source = LK.Track.Source;
  var CHAT_TOPIC = 'lk.chat';            // LiveKit components chat (text streams) — what the web uses
  var LEGACY_CHAT_TOPIC = 'lk-chat-topic'; // older chat format, still sent alongside for old servers

  var container = document.getElementById('container');
  var grid = document.getElementById('grid');
  var stage = document.getElementById('stage');
  var stageLabel = document.getElementById('stage-label');

  var room = new LK.Room({ adaptiveStream: true, dynacast: true });
  var facingMode = 'user';
  var speaking = {};
  var screenSharer = null;

  function roleOf(p) {
    try { return (JSON.parse(p.metadata || '{}').role || '').toLowerCase(); } catch (e) { return ''; }
  }
  function displayName(p) { return p.name || p.identity; }
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + ((parts[1] || '')[0] || '')).toUpperCase();
  }
  function allParticipants() {
    var list = [room.localParticipant];
    room.remoteParticipants.forEach(function (p) { list.push(p); });
    return list;
  }
  function pubOf(p, source) {
    var pub = p.getTrackPublication(source);
    return pub && pub.track && !pub.isMuted ? pub : null;
  }

  /* ---------------------------------------------------------------- tiles */

  function tileFor(p) {
    var id = 'p-' + p.identity;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'tile';
      el.id = id;
      el.innerHTML =
        '<div class="avatar"><span></span></div>' +
        '<div class="label"><span class="mic"></span><span class="nm"></span></div>';
      if (p.isLocal) grid.insertBefore(el, grid.firstChild); else grid.appendChild(el);
    }
    return el;
  }

  function renderTile(p) {
    var el = tileFor(p);
    var name = displayName(p) + (p.isLocal ? ' (' + (cfg.youLabel || 'You') + ')' : '');
    el.querySelector('.nm').textContent = name;
    el.querySelector('.avatar span').textContent = initials(displayName(p));
    el.classList.toggle('trainer', roleOf(p) === 'trainer');
    el.classList.toggle('speaking', !!speaking[p.identity]);
    el.querySelector('.mic').className = 'mic' + (pubOf(p, Source.Microphone) ? '' : ' off');

    var camPub = pubOf(p, Source.Camera);
    var video = el.querySelector('video');
    if (camPub) {
      if (!video || video.__track !== camPub.track) {
        if (video) video.remove();
        video = camPub.track.attach();
        video.__track = camPub.track;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        el.insertBefore(video, el.firstChild);
      }
      video.classList.toggle('mirror', p.isLocal && facingMode === 'user');
      el.classList.add('has-video');
    } else {
      if (video) { if (video.__track) video.__track.detach(video); video.remove(); }
      el.classList.remove('has-video');
    }
  }

  function renderStage() {
    var sharer = null;
    var sharePub = null;
    allParticipants().forEach(function (p) {
      if (sharer) return;
      var pub = pubOf(p, Source.ScreenShare);
      if (pub && !p.isLocal) { sharer = p; sharePub = pub; }
    });
    var current = stage.querySelector('video');
    if (sharePub) {
      if (!current || current.__track !== sharePub.track) {
        if (current) current.remove();
        var v = sharePub.track.attach();
        v.__track = sharePub.track;
        v.autoplay = true;
        v.playsInline = true;
        v.muted = true;
        stage.appendChild(v);
      }
      stageLabel.textContent = displayName(sharer);
      container.classList.add('presenting');
    } else {
      if (current) { if (current.__track) current.__track.detach(current); current.remove(); }
      container.classList.remove('presenting');
    }
    var nowSharer = sharer ? displayName(sharer) : null;
    if (nowSharer !== screenSharer) {
      screenSharer = nowSharer;
      post({ type: 'screen-share', active: !!sharer, presenter: nowSharer });
    }
  }

  function refresh() {
    allParticipants().forEach(renderTile);
    renderStage();
    var count = room.remoteParticipants.size + 1;
    grid.setAttribute('data-count', String(Math.min(count, 5)));
    var hasRemoteVideo = false;
    room.remoteParticipants.forEach(function (p) { if (pubOf(p, Source.Camera)) hasRemoteVideo = true; });
    post({
      type: 'participants',
      count: count,
      hasRemoteVideo: hasRemoteVideo,
      participants: allParticipants().map(function (p) {
        return {
          identity: p.identity,
          name: displayName(p),
          isLocal: !!p.isLocal,
          role: roleOf(p),
          micOn: !!pubOf(p, Source.Microphone),
          camOn: !!pubOf(p, Source.Camera),
          speaking: !!speaking[p.identity],
        };
      }),
    });
  }

  /* ---------------------------------------------------------------- media */

  room.on(LK.RoomEvent.TrackSubscribed, function (track) {
    if (track.kind === 'audio') {
      var a = track.attach();
      a.autoplay = true;
      document.body.appendChild(a);
    }
    refresh();
  });
  room.on(LK.RoomEvent.TrackUnsubscribed, function (track) {
    if (track.kind === 'audio') track.detach().forEach(function (e) { e.remove(); });
    refresh();
  });
  [LK.RoomEvent.TrackMuted, LK.RoomEvent.TrackUnmuted, LK.RoomEvent.LocalTrackPublished,
   LK.RoomEvent.LocalTrackUnpublished, LK.RoomEvent.TrackPublished, LK.RoomEvent.TrackUnpublished,
   LK.RoomEvent.ParticipantConnected, LK.RoomEvent.ParticipantMetadataChanged,
   LK.RoomEvent.ParticipantNameChanged].forEach(function (ev) {
    if (ev) room.on(ev, refresh);
  });
  room.on(LK.RoomEvent.ParticipantDisconnected, function (p) {
    var el = document.getElementById('p-' + p.identity);
    if (el) el.remove();
    delete speaking[p.identity];
    refresh();
  });
  room.on(LK.RoomEvent.ActiveSpeakersChanged, function (speakers) {
    speaking = {};
    speakers.forEach(function (p) { speaking[p.identity] = true; });
    refresh();
  });
  room.on(LK.RoomEvent.AudioPlaybackStatusChanged, function () {
    post({ type: 'audio-blocked', blocked: !room.canPlaybackAudio });
  });

  /* ----------------------------------------------------------- connection */

  room.on(LK.RoomEvent.Reconnecting, function () { post({ type: 'reconnecting' }); });
  room.on(LK.RoomEvent.Reconnected, function () { post({ type: 'reconnected' }); refresh(); });
  room.on(LK.RoomEvent.Disconnected, function (reason) {
    var name = LK.DisconnectReason && reason !== undefined ? LK.DisconnectReason[reason] : undefined;
    post({ type: 'disconnected', reason: name || 'UNKNOWN_REASON' });
  });

  /* ----------------------------------------------------------------- data */

  // App events (quiz, hand raise): reliable topic-less JSON with a "type" — same as the web.
  room.on(LK.RoomEvent.DataReceived, function (payload, participant, kind, topic) {
    var data;
    try { data = JSON.parse(new TextDecoder().decode(payload)); } catch (e) { return; }
    if (topic === LEGACY_CHAT_TOPIC) {
      // Old chat format; newer senders mark it ignorable because they also sent a text stream.
      if (data && !data.ignoreLegacy && data.message) {
        post({
          type: 'chat',
          id: data.id,
          timestamp: data.timestamp || Date.now(),
          message: String(data.message),
          fromIdentity: participant ? participant.identity : null,
          fromName: participant ? displayName(participant) : '',
        });
      }
      return;
    }
    if (!data || typeof data.type !== 'string') return;
    post({
      type: 'data-channel',
      event: data,
      participantIdentity: participant ? participant.identity : null,
      participantName: participant ? displayName(participant) : null,
    });
  });

  if (room.registerTextStreamHandler) {
    room.registerTextStreamHandler(CHAT_TOPIC, function (reader, participantInfo) {
      reader.readAll().then(function (text) {
        var from = room.getParticipantByIdentity
          ? room.getParticipantByIdentity(participantInfo.identity)
          : null;
        post({
          type: 'chat',
          id: reader.info.id,
          timestamp: reader.info.timestamp || Date.now(),
          message: text,
          fromIdentity: participantInfo.identity,
          fromName: from ? displayName(from) : participantInfo.identity,
        });
      });
    });
  }

  function serverSupportsTextStreams() {
    var info = room.serverInfo || {};
    if (info.edition === 1) return true;
    if (!info.version) return false;
    var a = String(info.version).split('.').map(Number);
    var b = [1, 8, 2];
    for (var i = 0; i < 3; i++) {
      if ((a[i] || 0) > b[i]) return true;
      if ((a[i] || 0) < b[i]) return false;
    }
    return false;
  }

  /* ------------------------------------------------------ RN command API */

  function fail(e) { post({ type: 'error', message: String((e && e.message) || e) }); }

  window.eltms = {
    setMic: function (on) {
      room.localParticipant.setMicrophoneEnabled(on)
        .then(function () { post({ type: 'media', mic: on }); refresh(); })
        .catch(fail);
    },
    setCam: function (on) {
      room.localParticipant.setCameraEnabled(on, { facingMode: facingMode })
        .then(function () { post({ type: 'media', cam: on }); refresh(); })
        .catch(fail);
    },
    flipCam: function () {
      var pub = room.localParticipant.getTrackPublication(Source.Camera);
      if (!pub || !pub.track) return;
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      pub.track.restartTrack({ facingMode: facingMode }).then(refresh).catch(fail);
    },
    startAudio: function () {
      room.startAudio().then(function () { post({ type: 'audio-blocked', blocked: false }); });
    },
    broadcastData: function (eventObj) {
      try {
        var str = typeof eventObj === 'string' ? eventObj : JSON.stringify(eventObj);
        room.localParticipant.publishData(new TextEncoder().encode(str), { reliable: true });
      } catch (e) { fail(e); }
    },
    sendChat: function (clientId, message) {
      var lp = room.localParticipant;
      var sendLegacy = function (id, ignoreLegacy) {
        var legacy = { id: id, timestamp: Date.now(), message: message, ignoreLegacy: ignoreLegacy };
        return lp.publishData(new TextEncoder().encode(JSON.stringify(legacy)), {
          reliable: true,
          topic: LEGACY_CHAT_TOPIC,
        });
      };
      var done = function (id) { post({ type: 'chat-sent', clientId: clientId, id: id }); };
      if (lp.sendText) {
        lp.sendText(message, { topic: CHAT_TOPIC })
          .then(function (info) {
            done(info.id);
            return sendLegacy(info.id, serverSupportsTextStreams()).catch(function () {});
          })
          .catch(function () {
            sendLegacy(clientId, false).then(function () { done(clientId); }).catch(fail);
          });
      } else {
        sendLegacy(clientId, false).then(function () { done(clientId); }).catch(fail);
      }
    },
    leave: function () { room.disconnect(); },
  };

  room.connect(cfg.wsUrl, cfg.token, { autoSubscribe: true })
    .then(function () {
      post({ type: 'connected', identity: room.localParticipant.identity });
      refresh();
    })
    .catch(fail);
})();

</script></body></html>`;
}
