/* =====================================================================
   WORLD LEADER · 4a. RENDER DEL GLOBO (Three.js)
   No conoce las reglas del juego: recibe colores, selección, rutas y
   frentes de guerra, y devuelve el país bajo el cursor.
   Técnica: una textura de IDs (1 byte por píxel = índice de país) y una
   paleta de 256 px. El shader suaviza las fronteras con un bilineal
   propio sobre los IDs, así cambiar de modo de mapa cuesta 1 KB.
   ===================================================================== */
(function () {
  'use strict';
  const WL = globalThis.WL, GEO = WL.GEO, C = WL.DATA.C;
  const G = WL.Globe = { ready: false, spin: true };
  const noop = () => { };
  ['paint', 'select', 'hover', 'hoverProv', 'focus', 'home', 'setRoutes', 'trip', 'setWars', 'setTheatre', 'setQuality', 'fx', 'onPick', 'onHover', 'resize'].forEach(k => G[k] = noop);

  const NOISE = `
    float hash(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }`;
  const VERT = `varying vec3 vPos; varying vec3 vV; varying vec3 vN;
    void main(){ vPos=position; vec4 mv=modelViewMatrix*vec4(position,1.); vV=mv.xyz; vN=normalMatrix*normal; gl_Position=projectionMatrix*mv; }`;
  const EARTH = `precision highp float;
    uniform sampler2D uId, uPal, uState; uniform vec2 uSize, uProv; uniform vec3 uSun; uniform float uTime, uNight;
    varying vec3 vPos; varying vec3 vV; varying vec3 vN;
    ${NOISE}
    vec2 idAt(vec2 t){ vec2 uv=(t+.5)/uSize; vec4 x=texture2D(uId,vec2(uv.x,clamp(uv.y,0.,1.))); return floor(vec2(x.r,x.a)*255.+.5); } // (país, provincia)
    void main(){
      vec3 n=normalize(vPos);
      float lon=atan(-n.z,n.x), lat=asin(clamp(n.y,-1.,1.));
      vec2 st=vec2(lon/6.2831853+.5,.5-lat/3.14159265)*uSize;
      // huella del píxel en texels: al alejar se muestrea una rejilla más gruesa (mip manual de IDs)
      float fp=length(fwidth(vPos))*uSize.x/6.2831853;
      float s=exp2(floor(log2(max(fp*.75,1.))));
      vec2 q=st/s-.5, f=fract(q), c0=(floor(q)+.5)*s;
      vec2 p00=idAt(floor(c0)), p10=idAt(floor(c0+vec2(s,0.))), p01=idAt(floor(c0+vec2(0.,s))), p11=idAt(floor(c0+vec2(s,s)));
      float i00=p00.x*256.+p00.y, i10=p10.x*256.+p10.y, i01=p01.x*256.+p01.y, i11=p11.x*256.+p11.y;
      float w00=(1.-f.x)*(1.-f.y), w10=f.x*(1.-f.y), w01=(1.-f.x)*f.y, w11=f.x*f.y;
      float a00=w00+(i10==i00?w10:0.)+(i01==i00?w01:0.)+(i11==i00?w11:0.);
      float a10=w10+(i00==i10?w00:0.)+(i01==i10?w01:0.)+(i11==i10?w11:0.);
      float a01=w01+(i00==i01?w00:0.)+(i10==i01?w10:0.)+(i11==i01?w11:0.);
      float a11=w11+(i00==i11?w00:0.)+(i10==i11?w10:0.)+(i01==i11?w01:0.);
      vec2 pid=p00; float a=a00; if(a10>a){pid=p10;a=a10;} if(a01>a){pid=p01;a=a01;} if(a11>a){pid=p11;a=a11;}
      float id=pid.x, aC=(p00.x==id?w00:0.)+(p10.x==id?w10:0.)+(p01.x==id?w01:0.)+(p11.x==id?w11:0.), ew=clamp(1.4*fp/s,.03,.35);
      float edge=clamp((aC-.5)/ew,0.,1.);                                  // frontera entre países: 0 en la línea, 1 dentro
      float edgeP=mix(1.,clamp((a-.5)/ew,0.,1.),smoothstep(1.7,.9,fp));    // límite entre provincias: solo al acercarse
      vec4 pal=texture2D(uPal,vec2((pid.y+.5)/256.,(id+.5)/256.)), stt=texture2D(uState,vec2((id+.5)/256.,.5));
      // relieve procedural: cordilleras por ruido "ridged" + normal perturbada por derivadas
      float hh=fbm(n*6.+2.), elev=pow(1.-abs(2.*hh-1.),2.)*.7+hh*.3;
      vec3 N=normalize(vN), V=normalize(-vV), L=normalize((viewMatrix*vec4(uSun,0.)).xyz);
      vec3 sx=dFdx(vV), sy=dFdy(vV), r1=cross(sy,N), r2=cross(N,sx); float det=dot(sx,r1);
      vec3 Nb=normalize(abs(det)*N-.045*sign(det)*(dFdx(elev)*r1+dFdy(elev)*r2));
      float ndl=dot(N,L), day=smoothstep(-.25,.35,ndl), pulse=.5+.5*sin(uTime*3.);
      vec3 col;
      if(id>.5){
        float d=max(dot(Nb,L),0.);
        vec3 base=mix(pal.rgb, pal.rgb*vec3(.8,.84,.78)+.07, elev*.4);
        float snow=smoothstep(.93,.985,abs(n.y)+elev*.05); base=mix(base,vec3(.88,.93,1.),snow*.75);
        col=base*(.4+.14*day+.8*d*day) + base*.2*pow(max(dot(Nb,V),0.),2.)*(1.-day);
        float city=smoothstep(.86,.95,noise(n*260.))*smoothstep(.5,.75,noise(n*27.))*(1.-day)*(1.-snow);
        col+=vec3(1.,.8,.45)*city*uNight;
        col*=mix(.6,1.,edgeP);
        col=mix(col*.38,col,edge);                                          // fronteras
        col+=base*.16*step(abs(id-uProv.x)+abs(pid.y-uProv.y),.5);          // provincia bajo el cursor
        col+=base*stt.b*.22;                                                // país bajo el cursor
        col=mix(col,vec3(1.,.83,.42),stt.g*(1.-edge)*.95);                  // contorno dorado de la selección
        col+=vec3(1.,.78,.3)*stt.g*(.11+.09*pulse);
        float stripe=smoothstep(.42,.58,fract((n.x+n.y*1.7+n.z*.6)*46.+uTime*.35));
        col=mix(col,vec3(.95,.13,.08),stt.r*stripe*.36*(.55+.45*pulse));     // país en guerra
      } else {
        float depth=fbm(n*3.+11.);
        float coast=clamp((1.-a)*2.,0.,1.);
        col=mix(vec3(.01,.045,.12),vec3(.025,.17,.3),depth*.55+coast*.5);
        vec3 Nw=normalize(N+(noise(n*90.+vec3(uTime*.25))-.5)*.06);
        float spec=pow(max(dot(Nw,normalize(L+V)),0.),80.);
        col=col*(.4+.75*max(ndl,0.))+vec3(1.,.92,.78)*spec*.85*day;
        col+=vec3(.12,.55,.75)*coast*.3*(.35+.65*day);
      }
      float fres=pow(1.-max(dot(N,V),0.),3.);
      col+=vec3(.22,.52,1.)*fres*(.2+.8*day)*.85;                           // dispersión en el limbo
      gl_FragColor=vec4(col,1.);
    }`;
  const ATMO = `precision highp float; uniform vec3 uSun; varying vec3 vPos; varying vec3 vN;
    void main(){ float k=clamp(-normalize(vN).z*2.1,0.,1.); float day=smoothstep(-.5,.5,dot(normalize(vPos),uSun));
      gl_FragColor=vec4(mix(vec3(.12,.3,.75),vec3(.3,.62,1.),day)*pow(k,2.4)*(.35+.65*day)*1.25,1.); }`;
  const CLOUD = `precision highp float; uniform vec3 uSun; uniform float uTime, uFade; varying vec3 vPos;
    ${NOISE}
    void main(){ vec3 n=normalize(vPos); float c=fbm(n*3.6+vec3(uTime*.012,0.,uTime*.007)); c=smoothstep(.5,.78,c+.12*noise(n*14.));
      float day=smoothstep(-.3,.4,dot(n,uSun)); gl_FragColor=vec4(vec3(.55+.45*day),c*.42*uFade*(.35+.65*day)); }`;
  const ARC_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
  const ARC_F = `precision highp float; uniform vec3 uCol; uniform float uTime, uHead, uTrip; varying vec2 vUv;
    void main(){ float a;
      if(uTrip>.5){ a=smoothstep(uHead-.3,uHead,vUv.x)*step(vUv.x,uHead)*1.4*smoothstep(1.25,1.,uHead); }
      else { float d=fract(vUv.x*5.-uTime*.35); a=.16+.8*smoothstep(.75,1.,d); }
      gl_FragColor=vec4(uCol*a,a); }`;
  const FX_V = `attribute float aPh; uniform float uTime, uScale; varying float vA;
    void main(){ float t=fract(uTime*.6+aPh); vA=sin(t*3.14159); vec4 mv=modelViewMatrix*vec4(position*(1.+.012*t),1.);
      gl_PointSize=uScale*(.4+1.6*vA)*(.6+aPh)/-mv.z; gl_Position=projectionMatrix*mv; }`;
  const FX_F = `precision highp float; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float g=smoothstep(.5,0.,d);
      gl_FragColor=vec4(mix(vec3(1.,.25,.05),vec3(1.,.85,.4),g*g)*g*vA,1.); }`;
  const TH_V = `attribute float aPh, aS; attribute vec3 aCol; uniform float uTime, uScale; varying float vA; varying vec3 vC;
    void main(){ float t=fract(uTime*.5+aPh); vA=.35+.65*sin(t*3.14159); vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uScale*aS*(.7+.6*t)/-mv.z; gl_Position=projectionMatrix*mv; }`;
  const TH_F = `precision highp float; varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); float a=(smoothstep(.5,.42,d)*smoothstep(.3,.38,d)+smoothstep(.16,0.,d)*.9)*vA; gl_FragColor=vec4(vC*a,a); }`;
  const AUR = `precision highp float; uniform vec3 uSun; uniform float uTime; varying vec3 vPos;
    ${NOISE}
    void main(){ vec3 n=normalize(vPos); float lat=abs(n.y), band=smoothstep(.78,.86,lat)*smoothstep(.97,.9,lat);
      float w=noise(vec3(atan(n.z,n.x)*4.,uTime*.22,n.y*9.)), cur=pow(w,2.2)*band*smoothstep(.15,-.25,dot(n,uSun));
      vec3 c=mix(vec3(.1,1.,.55),vec3(.65,.3,1.),smoothstep(.35,.85,w)); gl_FragColor=vec4(c*cur*1.3,cur); }`;
  const BF_V = `attribute float aR; uniform float uT, uScale; varying float vA;
    void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vA=(1.-uT)*(.5+.5*aR); gl_PointSize=uScale*(1.2+2.4*aR)*(.6+uT*.9)/-mv.z; gl_Position=projectionMatrix*mv; }`;
  const BF_F = `precision highp float; uniform vec3 uC0, uC1; uniform float uT; varying float vA; void main(){ float d=length(gl_PointCoord-.5), g=smoothstep(.5,0.,d); gl_FragColor=vec4(mix(uC0,uC1,uT)*g*vA, g*vA); }`;
  const MK_V = `uniform float uScale; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uScale; gl_Position=projectionMatrix*mv; }`;
  const MK_F = `precision highp float; void main(){ float d=length(gl_PointCoord-.5); float ring=smoothstep(.5,.42,d)*smoothstep(.26,.34,d)+smoothstep(.14,.08,d);
      gl_FragColor=vec4(vec3(.55,.9,1.),ring*.9); }`;

  const ll2v = (lat, lon, r) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180, c = Math.cos(a) * (r || 1); return new THREE.Vector3(c * Math.cos(o), Math.sin(a) * (r || 1), -c * Math.sin(o)); };

  G.init = function (host, labelHost) {
    return new Promise((resolve, reject) => {
      if (typeof THREE === 'undefined') return reject(new Error('Three.js no cargó'));
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return reject(e); }
      const mobile = Math.min(innerWidth, innerHeight) < 700;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
      renderer.setClearColor(0x02040a, 1);
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, .05, 200);
      const sun = new THREE.Vector3(1, .25, .4).normalize(), U = { uTime: { value: 0 }, uSun: { value: sun }, uNight: { value: .5 } };

      // --- textura de IDs desde el PNG incrustado
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo leer el mapa'));
      img.onload = () => {
        const W = GEO.W, H = GEO.H, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
        const px = cx.getImageData(0, 0, W, H).data, ids = new Uint8Array(W * H * 2); // 2 bytes por píxel: país y provincia
        for (let i = 0; i < W * H; i++) { ids[i * 2] = px[i * 4]; ids[i * 2 + 1] = px[i * 4 + 1]; }
        cv.width = cv.height = 1;
        const idTex = new THREE.DataTexture(ids, W, H, THREE.LuminanceAlphaFormat, THREE.UnsignedByteType);
        idTex.minFilter = idTex.magFilter = THREE.NearestFilter; idTex.wrapS = THREE.RepeatWrapping; idTex.unpackAlignment = 1; idTex.needsUpdate = true;
        const mk256 = h => { const d = new Uint8Array(256 * h * 4), t = new THREE.DataTexture(d, 256, h, THREE.RGBAFormat, THREE.UnsignedByteType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return [d, t]; };
        const [pal, palTex] = mk256(256), [stt, sttTex] = mk256(1), uProv = new THREE.Vector2(-1, -1); // paleta: fila = país, columna = provincia
        for (let i = 0; i < 65536; i++) { pal[i * 4] = 70; pal[i * 4 + 1] = 78; pal[i * 4 + 2] = 92; pal[i * 4 + 3] = 255; }

        const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 80), new THREE.ShaderMaterial({
          uniforms: Object.assign({ uId: { value: idTex }, uPal: { value: palTex }, uState: { value: sttTex }, uProv: { value: uProv }, uSize: { value: new THREE.Vector2(W, H) } }, U),
          vertexShader: VERT, fragmentShader: EARTH, extensions: { derivatives: true }
        }));
        scene.add(earth);
        const cloudU = Object.assign({ uFade: { value: 1 } }, U);
        const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.009, 96, 48), new THREE.ShaderMaterial({ uniforms: cloudU, vertexShader: VERT, fragmentShader: CLOUD, transparent: true, depthWrite: false })); scene.add(cloudMesh);
        const aurora = new THREE.Mesh(new THREE.SphereGeometry(1.03, 96, 48), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: AUR, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(aurora);
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 48), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: ATMO, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
        // estrellas
        { const n = 2600, p = new Float32Array(n * 3), c = new Float32Array(n * 3); let r = 7;
          const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
          for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, t = rnd() * 6.283, q = Math.sqrt(1 - u * u), b = .35 + rnd() * .65, w = rnd(); p[i * 3] = 90 * q * Math.cos(t); p[i * 3 + 1] = 90 * u; p[i * 3 + 2] = 90 * q * Math.sin(t); c[i * 3] = b * (.8 + .2 * w); c[i * 3 + 1] = b * .88; c[i * 3 + 2] = b * (1 - .2 * w); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
          scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true }))); }
        // marcadores de países diminutos (sin área clicable en el mapa)
        const small = Object.keys(C).filter(i => C[i].px < 60), mkU = { uScale: { value: 9 } };
        { const p = new Float32Array(small.length * 3); small.forEach((iso, i) => { const v = ll2v(C[iso].lat, C[iso].lon, 1.006); p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z; });
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
          scene.add(new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: mkU, vertexShader: MK_V, fragmentShader: MK_F, transparent: true, depthWrite: false }))); }

        // --- cámara orbital propia: arrastre con inercia, rueda/pellizco, vuelo suave
        const cur = { lon: -95, lat: 22, dist: 3.4 }, tgt = { lon: -95, lat: 22, dist: 3.4 }; let moved = true, lastTouch = 0, vw = 1, vh = 1;
        const el = renderer.domElement, ptr = new Map(); let dragDist = 0, pinch = 0;
        el.style.touchAction = 'none';
        const pickAt = (x, y) => {
          const r = el.getBoundingClientRect(), nx = (x - r.left) / r.width * 2 - 1, ny = -((y - r.top) / r.height) * 2 + 1;
          const o = cam.position, d = new THREE.Vector3(nx, ny, .5).unproject(cam).sub(o).normalize();
          const b = o.dot(d), c = o.dot(o) - 1, h = b * b - c; if (h < 0) return null;
          const p = o.clone().addScaledVector(d, -b - Math.sqrt(h));
          let best = null, bd = .0125 * cur.dist; // primero los marcadores cercanos
          for (const iso of small) { const dd = p.angleTo(ll2v(C[iso].lat, C[iso].lon)); if (dd < bd) { bd = dd; best = iso; } }
          if (best) return { iso: best, prov: 1 };
          const lon = Math.atan2(-p.z, p.x), lat = Math.asin(Math.max(-1, Math.min(1, p.y)));
          const tx = Math.min(W - 1, Math.floor((lon / 6.2831853 + .5) * W)), ty = Math.min(H - 1, Math.floor((.5 - lat / Math.PI) * H));
          const k = (ty * W + tx) * 2, iso = GEO.iso[ids[k]]; return iso ? { iso, prov: ids[k + 1] } : null;
        };
        let cbPick = noop, cbHover = noop, hoverXY = null;
        el.addEventListener('pointerdown', e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragDist = 0; G.spin = false; lastTouch = performance.now(); try { el.setPointerCapture(e.pointerId); } catch (_) { } });
        el.addEventListener('pointermove', e => {
          const p = ptr.get(e.pointerId);
          if (!p) { if (e.pointerType === 'mouse') hoverXY = [e.clientX, e.clientY]; return; }
          const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; lastTouch = performance.now();
          if (ptr.size === 1) { dragDist += Math.abs(dx) + Math.abs(dy); const k = .11 * (tgt.dist - .92) * (700 / Math.max(300, vh)); tgt.lon -= dx * k; tgt.lat = Math.max(-84, Math.min(84, tgt.lat + dy * k)); }
          else if (ptr.size === 2) { const a = [...ptr.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch) tgt.dist = Math.max(1.3, Math.min(5, tgt.dist * pinch / d)); pinch = d; dragDist += 10; }
        });
        const up = e => { if (!ptr.has(e.pointerId)) return; const was = ptr.size; ptr.delete(e.pointerId); pinch = 0; if (was === 1 && dragDist < 7 && e.type === 'pointerup') { const r = pickAt(e.clientX, e.clientY); cbPick(r && r.iso, r && r.prov); } };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', () => { hoverXY = null; cbHover(null); });
        el.addEventListener('wheel', e => { e.preventDefault(); tgt.dist = Math.max(1.3, Math.min(5, tgt.dist * (1 + Math.sign(e.deltaY) * .1))); G.spin = false; lastTouch = performance.now(); }, { passive: false });

        // --- etiquetas de países (DOM), más cuantas más cerca
        const order = Object.keys(C).filter(i => C[i].px > 0).sort((a, b) => C[b].px - C[a].px), labels = [];
        order.slice(0, 110).forEach(iso => { const d = document.createElement('div'); d.className = 'glabel'; d.textContent = C[iso].n; d.hidden = true; labelHost.appendChild(d); labels.push({ iso, d, v: ll2v(C[iso].lat, C[iso].lon, 1.01), on: false }); });
        const tmp = new THREE.Vector3();
        function updLabels() {
          const n = Math.round(14 + Math.max(0, 3.4 - cur.dist) / 2.1 * 96), cp = cam.position.clone().normalize();
          labels.forEach((l, i) => {
            let on = i < n && l.v.dot(cp) > .32 + (cur.dist < 2 ? .25 : 0);
            if (on) { tmp.copy(l.v).project(cam); l.d.style.transform = `translate(${((tmp.x + 1) / 2 * vw) | 0}px,${((1 - tmp.y) / 2 * vh) | 0}px) translate(-50%,-50%)`; }
            if (on !== l.on) { l.d.hidden = !on; l.on = on; }
          });
        }
        G.label = (iso, text, cls) => { const l = labels.find(x => x.iso === iso); if (l) { if (text) l.d.textContent = text; l.d.className = 'glabel ' + (cls || ''); } };

        // --- rutas comerciales, viajes y frentes de guerra
        const routes = new THREE.Group(), trips = []; scene.add(routes);
        function arcMesh(a, b, col, trip) {
          const A = ll2v(C[a].lat, C[a].lon), B = ll2v(C[b].lat, C[b].lon), ang = A.angleTo(B), pts = [];
          if (ang < .01) return null;
          for (let i = 0; i <= 40; i++) { const t = i / 40, s = Math.sin(ang); pts.push(A.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).addScaledVector(B, Math.sin(t * ang) / s).multiplyScalar(1.012 + Math.sin(Math.PI * t) * (.04 + ang * .09))); }
          const u = { uCol: { value: new THREE.Color(col) }, uTime: U.uTime, uHead: { value: 0 }, uTrip: { value: trip ? 1 : 0 } };
          const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, trip ? .0055 : .0032, 5, false), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ARC_V, fragmentShader: ARC_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          m.userData.u = u; return m;
        }
        const clear = g => { while (g.children.length) { const m = g.children.pop(); m.geometry.dispose(); m.material.dispose(); } };
        G.setRoutes = list => { clear(routes); list.slice(0, 26).forEach(r => { const m = arcMesh(r.a, r.b, r.gold ? 0xffc94a : 0x35d6ff); if (m) routes.add(m); }); };
        G.trip = o => { const m = arcMesh(o.a, o.b, o.cargo ? 0x7dffb0 : 0xffe9a8, true); if (!m) return; scene.add(m); trips.push({ m, t0: performance.now() }); };
        let fx = null; const fxU = { uTime: U.uTime, uScale: { value: 30 } };
        G.setWars = list => {
          if (fx) { scene.remove(fx); fx.geometry.dispose(); fx = null; } if (!list.length) return;
          const per = 34, p = new Float32Array(list.length * per * 3), ph = new Float32Array(list.length * per); let r = 11, k = 0;
          const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
          list.slice(0, 12).forEach(iso => { const sp = Math.min(9, 1.2 + Math.sqrt(C[iso].px) / 22); for (let i = 0; i < per; i++, k++) { const v = ll2v(C[iso].lat + (rnd() - .5) * sp, C[iso].lon + (rnd() - .5) * sp * 1.3, 1.013); p[k * 3] = v.x; p[k * 3 + 1] = v.y; p[k * 3 + 2] = v.z; ph[k] = rnd(); } });
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p.slice(0, k * 3), 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph.slice(0, k), 1));
          fx = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: fxU, vertexShader: FX_V, fragmentShader: FX_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(fx);
        };

        // --- teatro de operaciones (Fase 3): flechas de avance, línea del frente y zonas en disputa
        const thG = new THREE.Group(), thArrows = []; let thPts = null; scene.add(thG); const thU = { uTime: U.uTime, uScale: fxU.uScale };
        const arcLL = (A, B, col, wd, trip) => { const ang = A.angleTo(B), pts = []; if (ang < .002) return null;
          for (let i = 0; i <= 30; i++) { const t = i / 30, s = Math.sin(ang); pts.push(A.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).addScaledVector(B, Math.sin(t * ang) / s).multiplyScalar(1.01 + Math.sin(Math.PI * t) * (.01 + ang * .22))); }
          const u = { uCol: { value: new THREE.Color(col) }, uTime: U.uTime, uHead: { value: 0 }, uTrip: { value: trip ? 1 : 0 } };
          const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, wd, 5, false), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ARC_V, fragmentShader: ARC_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.userData.u = u; return m; };
        G.setTheatre = o => { clear(thG); thArrows.length = 0; if (thPts) { scene.remove(thPts); thPts.geometry.dispose(); thPts.material.dispose(); thPts = null; } if (!o) return;
          (o.arrows || []).slice(0, 40).forEach((a, i) => { const m = arcLL(ll2v(a.a[0], a.a[1]), ll2v(a.b[0], a.b[1]), a.c, a.w || .005, 1); if (m) { m.userData.ph = i * .37; thG.add(m); thArrows.push(m); } });
          (o.lines || []).slice(0, 40).forEach(l => { const m = arcLL(ll2v(l.a[0], l.a[1]), ll2v(l.b[0], l.b[1]), l.c, .0028, 0); if (m) thG.add(m); });
          const Z = (o.zones || []).slice(0, 80); if (!Z.length) return; const p = new Float32Array(Z.length * 3), ph = new Float32Array(Z.length), sz = new Float32Array(Z.length), co = new Float32Array(Z.length * 3), c = new THREE.Color();
          Z.forEach((z, i) => { const v = ll2v(z.p[0], z.p[1], 1.012); p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z; ph[i] = (i * .618) % 1; sz[i] = z.s || 3; c.set(z.c); co[i * 3] = c.r; co[i * 3 + 1] = c.g; co[i * 3 + 2] = c.b; });
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); g.setAttribute('aS', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(co, 3));
          thPts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: thU, vertexShader: TH_V, fragmentShader: TH_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(thPts); };

        // --- ráfagas de partículas por suceso (Fase 4): explosión, humo, ayuda, revolución, desastre, tormenta, sanción
        const FXK = { exp: [0xffa040, 0x3a3634, 1.8, 46, .5], humo: [0x8a8a90, 0x2a2a2e, 3.2, 30, .18], ayuda: [0x7dffb0, 0x2a7a5a, 2.4, 26, .3], rev: [0xff3b30, 0xffc94a, 2.6, 40, .45], des: [0xb48cff, 0x40306a, 2.8, 36, .35], tormenta: [0xdfe8ff, 0x5a6a8a, 4, 54, .3], sanc: [0x9aa0aa, 0x30343a, 2.2, 24, .25], tratado: [0xffd36a, 0x7a5a1a, 2.4, 34, .35] };
        const bursts = []; let fxScale = 1, skip = 1, fc = 0;
        G.fx = (kind, lat, lon) => { if (bursts.length > 14 || lat == null) return; const K = FXK[kind] || FXK.exp, n = Math.max(6, Math.round(K[3] * fxScale)), c = ll2v(lat, lon, 1.013), up = c.clone().normalize();
          const t1 = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize(), t2 = new THREE.Vector3().crossVectors(up, t1).normalize(), pos = new Float32Array(n * 3), vel = [], ar = new Float32Array(n);
          for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = Math.random(); ar[i] = Math.random(); pos[i * 3] = c.x; pos[i * 3 + 1] = c.y; pos[i * 3 + 2] = c.z;
            vel.push(t1.clone().multiplyScalar(Math.cos(a) * r * K[4] * .05).addScaledVector(t2, Math.sin(a) * r * K[4] * .05).addScaledVector(up, (kind === 'humo' ? .03 : .012) * Math.random())); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(ar, 1));
          const u = { uT: { value: 0 }, uScale: fxU.uScale, uC0: { value: new THREE.Color(K[0]) }, uC1: { value: new THREE.Color(K[1]) } }, m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: BF_V, fragmentShader: BF_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          scene.add(m); bursts.push({ m, u, vel, c, up, kind, t0: performance.now(), life: K[2] * 1000 }); };
        G.setQuality = (q, rm) => { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'high' ? 2 : q === 'med' ? 1.5 : 1)); G.resize(); cloudMesh.visible = q !== 'low'; aurora.visible = q === 'high';
          U.uNight.value = q === 'low' ? .32 : .55; fxScale = q === 'low' ? .35 : q === 'med' ? .7 : 1; skip = q === 'low' ? 2 : 1; G.rm = !!rm; if (rm) G.spin = false; };

        // --- API de pintado
        const idx = iso => (C[iso] || {}).idx || 0;
        // over = { iso: { nºprovincia: color } } para las provincias ocupadas por otro país
        G.paint = (colors, wars, over) => {
          const row = (ci, c, o) => { for (let p = 0; p < 256; p++) { const k = (ci * 256 + p) * 4, cc = (o && o[p]) || c; pal[k] = cc[0]; pal[k + 1] = cc[1]; pal[k + 2] = cc[2]; } };
          for (const iso in C) { row(C[iso].idx, colors[iso] || [70, 78, 92], over && over[iso]); stt[C[iso].idx * 4] = wars && wars[iso] ? 255 : 0; }
          row(255, [96, 104, 116]); palTex.needsUpdate = true; sttTex.needsUpdate = true;
        };
        G.hoverProv = (iso, prov) => { uProv.set(iso && C[iso] ? C[iso].idx : -1, prov || -1); };
        const flag = (ch, list) => { for (let i = 0; i < 256; i++) stt[i * 4 + ch] = 0; (list || []).forEach(iso => { stt[idx(iso) * 4 + ch] = 255; }); sttTex.needsUpdate = true; };
        G.select = list => flag(1, list); G.hover = list => flag(2, list);
        G.focus = (iso, d) => { const c = C[iso]; if (!c) return; tgt.lat = Math.max(-80, Math.min(80, c.lat)); tgt.lon = c.lon; tgt.dist = d || Math.max(1.7, Math.min(2.9, 1.6 + Math.sqrt(c.px) / 110)); G.spin = false; lastTouch = performance.now(); };
        G.home = () => { tgt.dist = 3.4; };
        G.onPick = f => cbPick = f; G.onHover = f => cbHover = f;
        G.resize = () => { vw = host.clientWidth || innerWidth; vh = host.clientHeight || innerHeight; renderer.setSize(vw, vh, false); el.style.width = vw + 'px'; el.style.height = vh + 'px'; cam.aspect = vw / vh; cam.fov = vw < vh ? 52 : 38; cam.updateProjectionMatrix(); moved = true; };
        addEventListener('resize', G.resize); G.resize();

        let last = performance.now();
        function frame(now) {
          requestAnimationFrame(frame); if (skip > 1 && (++fc % skip)) return; // calidad baja: 30 fps
          const dt = Math.min(.05, (now - last) / 1000); last = now; U.uTime.value += dt;
          if (G.spin) tgt.lon += dt * 4;
          let dl = ((tgt.lon - cur.lon + 540) % 360) - 180; const k = 1 - Math.pow(.0015, dt);
          if (Math.abs(dl) > .002 || Math.abs(tgt.lat - cur.lat) > .002 || Math.abs(tgt.dist - cur.dist) > .0005) moved = true;
          cur.lon += dl * k; tgt.lon = cur.lon + dl * (1 - k); cur.lat += (tgt.lat - cur.lat) * k; cur.dist += (tgt.dist - cur.dist) * k;
          cam.position.copy(ll2v(cur.lat, cur.lon, cur.dist)); cam.lookAt(0, 0, 0);
          const sa = U.uTime.value * .02 + 1.2; sun.set(Math.cos(sa), .28, Math.sin(sa)).normalize();
          cloudU.uFade.value = Math.max(.12, Math.min(1, (cur.dist - 1.5) / 1.3));
          mkU.uScale.value = Math.max(7, 26 / cur.dist) * renderer.getPixelRatio(); fxU.uScale.value = 15 * renderer.getPixelRatio() * (vh / 700);
          for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i], t = (now - b.t0) / b.life; if (t >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); bursts.splice(i, 1); continue; }
            b.u.uT.value = t; const P = b.m.geometry.attributes.position; for (let j = 0; j < b.vel.length; j++) { const v = b.vel[j]; if (b.kind === 'tormenta') v.applyAxisAngle(b.up, dt * 1.6); P.array[j * 3] += v.x * dt; P.array[j * 3 + 1] += v.y * dt; P.array[j * 3 + 2] += v.z * dt; v.multiplyScalar(1 - dt * .6); } P.needsUpdate = true; }
          for (const m of thArrows) m.userData.u.uHead.value = ((U.uTime.value * .4 + m.userData.ph) % 1) * 1.25;
          for (let i = trips.length - 1; i >= 0; i--) { const t = trips[i], h = (now - t.t0) / 2200; t.m.userData.u.uHead.value = h * 1.25; if (h > 1) { scene.remove(t.m); t.m.geometry.dispose(); t.m.material.dispose(); trips.splice(i, 1); } }
          if (hoverXY && now - lastTouch > 120) { const r = pickAt(hoverXY[0], hoverXY[1]); cbHover(r && r.iso, hoverXY[0], hoverXY[1], r && r.prov); hoverXY = null; }
          if (moved) { cam.updateMatrixWorld(); updLabels(); moved = false; }
          renderer.render(scene, cam);
        }
        G.ready = true; requestAnimationFrame(frame); resolve();
      };
      img.src = GEO.png;
    });
  };
})();
