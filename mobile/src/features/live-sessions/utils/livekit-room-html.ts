/**
 * Enterprise LiveKit web client page for a WebView.
 * Supports:
 * - Camera video grid and active speakers
 * - Dedicated full-width Presentation / Screen-Share Stage (Track.Source.ScreenShare)
 * - Sub-50ms reliable WebRTC Data Channel bridging for Live Quiz, Polls, Hand Raising, and Chat
 * - Mic/Camera controls and lifecycle events
 */
export function buildLiveKitRoomHtml(wsUrl: string, token: string): string {
  const config = JSON.stringify({ wsUrl, token });
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #020617; color: #e2e8f0; font-family: -apple-system, Roboto, sans-serif; overflow: hidden; }
  #container { display: flex; flex-direction: column; width: 100%; height: 100%; }
  
  /* Presentation stage for screen sharing */
  #presentation-stage { display: none; width: 100%; flex: 1; background: #020617; position: relative; overflow: hidden; }
  #presentation-stage.active { display: flex; align-items: center; justify-content: center; }
  #presentation-stage video { width: 100%; height: 100%; object-fit: contain; }
  .screen-badge { position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.9); color: #38bdf8; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.4); backdrop-filter: blur(6px); z-index: 10; }

  /* Camera grid */
  #grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; padding: 8px; flex: 1; align-content: center; overflow-y: auto; }
  #container.with-presentation #grid { flex: none; height: 110px; display: flex; flex-direction: row; gap: 8px; padding: 6px; background: #0b1120; border-top: 1px solid #1e293b; overflow-x: auto; align-content: stretch; }
  
  .tile { position: relative; background: #0f172a; border-radius: 10px; overflow: hidden; aspect-ratio: 16/10; border: 1px solid rgba(255,255,255,0.08); }
  #container.with-presentation .tile { flex: 0 0 140px; aspect-ratio: 16/10; height: 100%; }
  .tile video { width: 100%; height: 100%; object-fit: cover; }
  .name { position: absolute; left: 6px; bottom: 6px; font-size: 11px; background: rgba(0,0,0,0.7); padding: 2px 7px; border-radius: 999px; max-width: 90%; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
</style>
<script src="https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js"></script>
</head><body>
<div id="container">
  <div id="presentation-stage">
    <div class="screen-badge">Trainer Screen Share</div>
  </div>
  <div id="grid"></div>
</div>

<script>
(function(){
  var cfg = ${config};
  var post = function(m){
    var d = JSON.stringify(m);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(d);
    else if (window.parent !== window) window.parent.postMessage({ eltmsRoom: d }, '*');
  };

  var container = document.getElementById('container');
  var grid = document.getElementById('grid');
  var stage = document.getElementById('presentation-stage');

  if (!window.LivekitClient) {
    post({type:'error', message:'LiveKit client library could not be loaded'});
    return;
  }

  // WebRTC ICE Candidate & SDP Adapter for Local / Emulator / Docker environments
  (function installWebRtcAdapter() {
    if (!window.RTCPeerConnection) return;
    var OrigPC = window.RTCPeerConnection;

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
        if (candMatch && (candMatch[6] === '7881' || candMatch[6] === '7882')) {
          var found = candMatch[1];
          var comp = candMatch[2];
          var proto = candMatch[3];
          var prio = candMatch[4];
          var origIp = candMatch[5];
          var port = candMatch[6];
          var rest = candMatch[7];

          // Keep original candidate as fallback
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
        if (cMatch && (cMatch[6] === '7881' || cMatch[6] === '7882')) {
          var self = this;
          var hosts = getCandidateHosts();
          var promises = [];
          // Add original candidate first
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

  var LK = window.LivekitClient;
  var room = new LK.Room({ adaptiveStream: true, dynacast: true });
  var screenShareCount = 0;
  var remoteVideoCount = 0;

  function tileFor(p){
    var id = 'p-' + p.identity;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'tile';
      el.id = id;
      var n = document.createElement('div');
      n.className = 'name';
      n.textContent = p.name || p.identity;
      el.appendChild(n);
      grid.appendChild(el);
    }
    return el;
  }

  function refresh(){
    var count = room.remoteParticipants.size + 1;
    var hasVideo = (remoteVideoCount > 0 || screenShareCount > 0);
    post({
      type: 'stream-status',
      hasVideo: hasVideo,
      screenShare: screenShareCount > 0,
      remoteCount: room.remoteParticipants.size,
      participants: count
    });
    post({type:'participants', count: count});
  }

  // Track Subscribed (Camera, Mic, Screen Share)
  room.on(LK.RoomEvent.TrackSubscribed, function(track, pub, p){
    var isScreen = (track.source === LK.Track.Source.ScreenShare) || (pub && pub.source === LK.Track.Source.ScreenShare);
    if (isScreen) {
      screenShareCount++;
      var el = track.attach();
      el.id = 'screen-' + p.identity;
      el.autoplay = true;
      el.playsInline = true;
      stage.appendChild(el);
      stage.className = 'active';
      container.className = 'with-presentation';
      el.play && el.play().catch(function(e){ console.warn('screen play', e); });
      post({type: 'screen-share', active: true, presenter: p.name || p.identity});
    } else if (track.kind === 'video') {
      remoteVideoCount++;
      var el = track.attach();
      el.autoplay = true;
      el.playsInline = true;
      tileFor(p).insertBefore(el, tileFor(p).firstChild);
      el.play && el.play().catch(function(e){ console.warn('video play', e); });
    } else {
      var el = track.attach();
      el.autoplay = true;
      el.playsInline = true;
      document.body.appendChild(el);
      el.play && el.play().catch(function(e){ console.warn('audio play', e); });
    }
    refresh();
  });

  // Track Unsubscribed
  room.on(LK.RoomEvent.TrackUnsubscribed, function(track, pub, p){
    track.detach().forEach(function(e){ e.remove(); });
    var isScreen = (track.source === LK.Track.Source.ScreenShare) || (pub && pub.source === LK.Track.Source.ScreenShare);
    if (isScreen) {
      screenShareCount = Math.max(0, screenShareCount - 1);
      if (screenShareCount === 0) {
        stage.className = '';
        container.className = '';
        post({type: 'screen-share', active: false});
      }
    } else if (track.kind === 'video') {
      remoteVideoCount = Math.max(0, remoteVideoCount - 1);
    }
    refresh();
  });

  room.on(LK.RoomEvent.ParticipantConnected, function(p){ tileFor(p); refresh(); });
  room.on(LK.RoomEvent.ParticipantDisconnected, function(p){
    var el = document.getElementById('p-' + p.identity);
    if (el) {
      var vids = el.getElementsByTagName('video');
      remoteVideoCount = Math.max(0, remoteVideoCount - vids.length);
      el.remove();
    }
    var sc = document.getElementById('screen-' + p.identity);
    if (sc) {
      sc.remove();
      screenShareCount = Math.max(0, screenShareCount - 1);
      if (screenShareCount === 0) {
        stage.className = '';
        container.className = '';
        post({type: 'screen-share', active: false});
      }
    }
    refresh();
  });

  room.on(LK.RoomEvent.Reconnecting, function(){
    post({type: 'reconnecting'});
  });

  room.on(LK.RoomEvent.Reconnected, function(){
    post({type: 'reconnected'});
    refresh();
  });

  room.on(LK.RoomEvent.Disconnected, function(){
    post({type:'disconnected'});
  });

  // Data Channel for Live Quizzes, Hand Raising & In-Meeting Chat
  room.on(LK.RoomEvent.DataReceived, function(payload, participant){
    try {
      var str = new TextDecoder().decode(payload);
      var data = JSON.parse(str);
      post({
        type: 'data-channel',
        event: data,
        participantIdentity: participant ? participant.identity : null,
        participantName: participant ? (participant.name || participant.identity) : 'Trainer'
      });
    } catch(err) {
      console.warn('Malformed data packet:', err);
    }
  });

  // React Native Command Interface
  window.eltms = {
    setMic: function(on){
      room.localParticipant.setMicrophoneEnabled(on).then(function(){
        post({type:'media', mic:on});
      }).catch(function(e){
        post({type:'error', message:String(e && e.message || e)});
      });
    },
    setCam: function(on){
      room.localParticipant.setCameraEnabled(on).then(function(){
        post({type:'media', cam:on});
      }).catch(function(e){
        post({type:'error', message:String(e && e.message || e)});
      });
    },
    broadcastData: function(eventObj){
      try {
        var str = typeof eventObj === 'string' ? eventObj : JSON.stringify(eventObj);
        var payload = new TextEncoder().encode(str);
        room.localParticipant.publishData(payload, { reliable: true });
      } catch (e) {
        console.warn('Failed to publish data channel payload:', e);
      }
    },
    leave: function(){
      room.disconnect();
    }
  };

  room.connect(cfg.wsUrl, cfg.token, {
    autoSubscribe: true,
    rtcConfig: {
      iceTransportPolicy: 'all'
    }
  }).then(function(){
    room.remoteParticipants.forEach(function(p){ tileFor(p); });
    post({type:'connected'});
    refresh();
  }).catch(function(e){
    post({type:'error', message:String(e && e.message || e)});
  });
})();
</script></body></html>`;
}
