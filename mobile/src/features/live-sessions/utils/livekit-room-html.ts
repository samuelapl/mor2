/**
 * Self-contained LiveKit web client page for a WebView (works in Expo Go — no native SDK).
 * Talks to React Native via postMessage: {type:'connected'|'disconnected'|'participants'|'error'|'media'}.
 * React Native drives it with injected calls: window.eltms.setMic(bool) / setCam(bool) / leave().
 */
export function buildLiveKitRoomHtml(wsUrl: string, token: string): string {
  const config = JSON.stringify({ wsUrl, token });
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html,body{margin:0;height:100%;background:#0f172a;color:#e2e8f0;font-family:-apple-system,Roboto,sans-serif}
  #grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px;padding:6px;height:100%;box-sizing:border-box;align-content:center}
  .tile{position:relative;background:#1e293b;border-radius:12px;overflow:hidden;aspect-ratio:16/10}
  .tile video{width:100%;height:100%;object-fit:cover}
  .name{position:absolute;left:8px;bottom:6px;font-size:12px;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:999px}
  #status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:15px;color:#94a3b8}
</style>
<script src="https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js"></script>
</head><body>
<div id="grid"></div><div id="status">Connecting…</div>
<script>
(function(){
  var cfg = ${config};
  var post = function(m){ var d = JSON.stringify(m); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(d); else if (window.parent !== window) window.parent.postMessage({ eltmsRoom: d }, '*'); };
  var status = document.getElementById('status');
  var grid = document.getElementById('grid');
  if (!window.LivekitClient) { post({type:'error', message:'LiveKit client could not be loaded (no internet?)'}); status.textContent='Could not load the video client.'; return; }
  var LK = window.LivekitClient;
  var room = new LK.Room({ adaptiveStream: true, dynacast: true });

  function tileFor(p){
    var id = 'p-' + p.identity; var el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.className='tile'; el.id=id;
      var n=document.createElement('div'); n.className='name'; n.textContent=p.name||p.identity; el.appendChild(n); grid.appendChild(el); }
    return el;
  }
  function refresh(){
    var count = room.remoteParticipants.size + 1;
    status.style.display = room.remoteParticipants.size ? 'none' : 'flex';
    if (!room.remoteParticipants.size) status.textContent = 'Waiting for the trainer to join…';
    post({type:'participants', count: count});
  }
  room.on(LK.RoomEvent.TrackSubscribed, function(track, pub, p){
    var el = track.attach();
    if (track.kind === 'video') tileFor(p).insertBefore(el, tileFor(p).firstChild); else document.body.appendChild(el);
    refresh();
  });
  room.on(LK.RoomEvent.TrackUnsubscribed, function(track){ track.detach().forEach(function(e){ e.remove(); }); });
  room.on(LK.RoomEvent.ParticipantConnected, function(p){ tileFor(p); refresh(); });
  room.on(LK.RoomEvent.ParticipantDisconnected, function(p){ var el=document.getElementById('p-'+p.identity); if(el) el.remove(); refresh(); });
  room.on(LK.RoomEvent.Disconnected, function(){ post({type:'disconnected'}); status.style.display='flex'; status.textContent='You left the session.'; });

  window.eltms = {
    setMic: function(on){ room.localParticipant.setMicrophoneEnabled(on).then(function(){ post({type:'media', mic:on}); }).catch(function(e){ post({type:'error', message:String(e && e.message || e)}); }); },
    setCam: function(on){ room.localParticipant.setCameraEnabled(on).then(function(){ post({type:'media', cam:on}); }).catch(function(e){ post({type:'error', message:String(e && e.message || e)}); }); },
    leave: function(){ room.disconnect(); }
  };

  room.connect(cfg.wsUrl, cfg.token).then(function(){
    room.remoteParticipants.forEach(function(p){ tileFor(p); });
    post({type:'connected'}); refresh();
  }).catch(function(e){ post({type:'error', message:String(e && e.message || e)}); status.textContent='Could not connect to the session.'; });
})();
</script></body></html>`;
}
