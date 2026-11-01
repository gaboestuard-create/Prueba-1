import numpy as np, wave
SR=44100; DUR=34.2; N=int(SR*DUR); R=np.random.default_rng(3)
def mix(buf,sig,t0,g=1.0):
    i=int(t0*SR); j=min(N,i+len(sig))
    if i<N: buf[i:j]+=sig[:j-i]*g
def tt(d): return np.arange(int(d*SR))/SR
def midi(n): return 440*2**((n-69)/12)
def lp(x,a):  # one-pole lowpass
    y=np.empty_like(x);s=0.0
    for i,v in enumerate(x): s+=a*(v-s);y[i]=s
    return y
# ---------- música lo-fi ----------
M=np.zeros(N); bpm=88; beat=60/bpm
chords=[([48,52,55,59],36),([45,48,52,55],33),([50,53,57,60],38),([43,47,50,53],31)]
def ep(f,d=1.4):
    t=tt(d); e=np.exp(-2.4*t)*(1-np.exp(-t*400))
    s=np.sin(2*np.pi*f*t)+.38*np.sin(4*np.pi*f*t)*np.exp(-4*t)+.12*np.sin(6*np.pi*f*t)*np.exp(-7*t)
    return s*e*(1+.04*np.sin(2*np.pi*5*t))
nbar=int(DUR/(beat*4))+2
for bar in range(nbar):
    ch,bass=chords[(bar//2)%4]; t0=bar*beat*4
    for k in range(8):
        sw=.035 if k%2 else 0
        note=ch[[0,1,2,3,2,1,3,2][k]]+12*(k==7)
        mix(M,ep(midi(note)),t0+k*beat/2+sw,.20*(1 if k%2==0 else .75))
    # acorde sostenido suave
    for n in ch: mix(M,ep(midi(n-12),3.2)*.5,t0,.07)
    t=tt(beat*3.4); mix(M,np.sin(2*np.pi*midi(bass)*t)*np.exp(-1.3*t)*(1-np.exp(-t*80)),t0,.42)
    for b in (0,2):
        t=tt(.28); f=45+90*np.exp(-t*28); mix(M,np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*12),t0+b*beat,.55)
    for b in (1,3):
        t=tt(.16); n=R.normal(0,1,len(t)); n=n-lp(n,.25); mix(M,n*np.exp(-t*24),t0+b*beat+.01,.10)
    for k in range(8):
        t=tt(.05); n=R.normal(0,1,len(t)); n=n-lp(n,.5); mix(M,n*np.exp(-t*70),t0+k*beat/2+(.035 if k%2 else 0),.05 if k%2 else .02)
# crepitar de vinilo
for _ in range(120):
    i=R.integers(0,N-40); M[i:i+30]+=R.normal(0,1,30)*np.exp(-np.arange(30)/6)*.02
M=lp(M,.55)
env=np.minimum(1,np.arange(N)/(SR*1.0))*np.minimum(1,np.maximum(0,(DUR-np.arange(N)/SR))/2.2)
M*=env
# ---------- efectos ----------
F=np.zeros(N)
def whoosh(t0,d=.62):
    t=tt(d); n=R.normal(0,1,len(t)); sweep=.02+.5*np.sin(np.pi*t/d)**2
    y=np.empty_like(n);s=0.0
    for i,v in enumerate(n): s+=sweep[i]*(v-s);y[i]=s
    mix(F,y*np.sin(np.pi*t/d)**1.5,t0,1.3)
def pop(t0):
    t=tt(.16); f=260+520*(1-np.exp(-t*30)); mix(F,np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*26),t0,.35)
def thud(t0):
    t=tt(.4); f=60+70*np.exp(-t*30); n=R.normal(0,1,len(t)); n=lp(n,.15)
    mix(F,(np.sin(2*np.pi*np.cumsum(f)/SR)*1.0+n*.8)*np.exp(-t*14),t0,.9)
def tick(t0,g=.35):
    t=tt(.03); n=R.normal(0,1,len(t)); n=n-lp(n,.3); mix(F,n*np.exp(-t*160),t0,g)
def ding(t0,f=1046,g=.30):
    t=tt(1.1); mix(F,(np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-5*t))*np.exp(-t*4.5),t0,g)
def scratch(t0,d=.35):
    t=tt(d); n=R.normal(0,1,len(t)); n=n-lp(n,.12); mix(F,n*np.sin(np.pi*t/d),t0,.30)
for b in [4.3,10.1,14.5,21.2,25.9]: whoosh(b-.33)
for t in [.2,4.5,10.2,14.65,21.3,26.05]: pop(t+.05)
for t in [9.44,12.8,13.62]: thud(t)
for i in range(26): tick(4.6+i/26)
for i in range(18): tick(14.7+i/24)
for t in [14.95,15.75,16.6,23.5]: tick(t+.12,.5)
for t in [20.0,20.45]: ding(t,880 if t<20.2 else 1174)
ding(30.4,1318,.28);ding(30.55,1760,.18)
for t,d in [(1.7,.6),(3.45,.45),(25.1,.4),(14.0,.4)]: scratch(t,d)
scratch(23.42,.35)
for i in range(12): tick(18.1+i*.04,.18)
# ---------- exportar ----------
def save(x,name,peak):
    x=x/np.max(np.abs(x))*peak; w=wave.open(name,'wb'); w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype('<i2').tobytes());w.close()
save(M,'music.wav',.9); save(F,'sfx.wav',.9)
