import numpy as np, wave
SR=44100; DUR=31.6; N=int(SR*DUR); R=np.random.default_rng(5)
BAR=4*60/110; BEAT=BAR/4; C=[0,BAR*2,BAR*4,BAR*6,BAR*8,BAR*10,BAR*12]; CUT2=BAR*5
def rd(n):
    w=wave.open(n);x=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768;return x
def mix(b,s,t0,g=1.):
    i=int(t0*SR);j=min(N,i+len(s))
    if 0<=i<N:b[i:j]+=s[:j-i]*g
tt=lambda d:np.arange(int(d*SR))/SR
midi=lambda n:440*2**((n-69)/12)
def lp(x,a):
    y=np.empty_like(x);s=0.
    for i,v in enumerate(x):s+=a*(v-s);y[i]=s
    return y
# ---- voz re-temporizada sobre el compás ----
V=np.zeros(N);vo=rd('v2/voz.wav')
for a,b,t0 in [(0,2.05,.30),(2.2,3.95,4.55),(4.15,5.08,6.62),(5.08,7.75,8.85),(7.8,10.4,13.25),(10.45,12.73,17.62),(12.75,15.1,21.98),(15.15,18.62,26.40)]:
    seg=vo[int(a*SR):int(b*SR)].copy();f=int(.01*SR);seg[:f]*=np.linspace(0,1,f);seg[-f:]*=np.linspace(1,0,f);mix(V,seg,t0)
# ---- música (re menor, 110 bpm) ----
M=np.zeros(N)
CH=[(50,[62,65,69,72]),(46,[58,62,65,69]),(41,[60,65,69,72]),(48,[60,64,67,72])]  # Dm Bb F C
def saw(f,d):
    t=tt(d);return sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,8))
def pad(notes,d,g):
    t=tt(d);s=sum(saw(midi(n)*(1+dt),d) for n in notes for dt in(-.003,.003));env=np.minimum(1,t/.6)*np.minimum(1,(d-t)/.6);return lp(s*env,.06)*g
def pluck(f,g):
    t=tt(.35);return (np.sign(np.sin(2*np.pi*f*t))*.3+np.sin(2*np.pi*f*t))*np.exp(-t*14)*g
def kick(g=1):
    t=tt(.4);f=48+120*np.exp(-t*35);return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*7)*g
def noiseh(d,dec,a=.4):
    t=tt(d);n=R.normal(0,1,len(t));return (n-lp(n,a))*np.exp(-t*dec)
nb=int(DUR/BAR)+1
for b in range(nb):
    t0=b*BAR;root,ch=CH[b%4]
    if t0<C[1]:
        mix(M,pad([n-12 for n in ch],BAR,.05),t0)
        for k in (0,1):  # latido
            for off in(0,.18):mix(M,kick(.55 if off==0 else .35),t0+k*2*BEAT+off)
    elif t0<C[6]:
        mix(M,pad(ch,BAR,.03),t0)
        for q in range(4):
            mix(M,kick(.9),t0+q*BEAT)
            t=tt(BEAT*.9);mix(M,np.sin(2*np.pi*midi(root-12)*t)*np.minimum(1,t*40)*np.exp(-t*2)*.42,t0+q*BEAT+.02)
        for q in(1,3):mix(M,noiseh(.25,18,.15),t0+q*BEAT,.35)
        for q in range(16):mix(M,noiseh(.04,90,.6),t0+q*BEAT/4,.10 if q%2 else .05)
        if not(C[4]<=t0<C[5] and b%2):  # respiro en validación
            for q in range(16):mix(M,pluck(midi(ch[[0,2,1,3,2,0,3,1][q%8]]+12),.07),t0+q*BEAT/4)
for t0 in [C[6]]:
    mix(M,pad([50,57,62,65,69,76],DUR-t0,.06),t0)
    for q in range(8):mix(M,pluck(midi([74,77,81,84][q%4]),.06),t0+.6+q*BEAT/2)
# subidas (riser) antes de cada corte
F=np.zeros(N)
def riser(t_end,d=.9):
    t=tt(d);n=R.normal(0,1,len(t));y=np.empty_like(n);s=0.
    a=.02+.5*(t/d)**2
    for i,v in enumerate(n):s+=a[i]*(v-s);y[i]=s
    mix(F,y*(t/d)**2*1.4,t_end-d)
def boom(t0,g=1.):
    t=tt(1.2);f=38+60*np.exp(-t*12);mix(F,(np.sin(2*np.pi*np.cumsum(f)/SR)*1.1+lp(R.normal(0,1,len(t)),.08)*.6)*np.exp(-t*4),t0,g)
def beep(t0,f,d=.06,g=.25):
    t=tt(d);mix(F,np.sin(2*np.pi*f*t)*np.minimum(1,(d-t)*80)*np.minimum(1,t*400),t0,g)
for c in [C[1],C[2],C[3],C[4],C[5],C[6]]:riser(c,.7);boom(c,.8)
riser(CUT2,.35);boom(CUT2,.5)
t=tt(.95);f=900+500*np.sin(np.pi*t/.95);mix(F,np.sin(2*np.pi*np.cumsum(f)/SR)*.12,5.52)   # escáner
for i in range(22):beep(5.25+i*.05,2400,.012,.08)
for i,tv in enumerate([6.45]):beep(tv,1760,.12,.3)
t=tt(2.0);f=150+1100*(1-np.exp(-t*1.5));mix(F,np.sin(2*np.pi*np.cumsum(f)/SR)*(.5+.5*np.sin(2*np.pi*14*t))*np.minimum(1,t*3)*.18,C[2]+.1)  # centrífuga
R2=np.random.default_rng(1)
for i in range(30):beep(13.4+i*.09+R2.random()*.04,[1320,1760,2093,2637][R2.integers(0,4)],.03,.07)
for tv in [18.75,19.17,19.59]:beep(tv,1568,.08,.25);beep(tv+.06,2093,.1,.2)
boom(20.3,.9)
for i,tv in enumerate([27.0,27.12,27.24,27.36]):beep(tv,[1760,2217,2637,3520][i],.5,.08)
boom(30.55,.6)
def save(x,n,peak):
    x=x/np.max(np.abs(x))*peak;w=wave.open(n,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype('<i2').tobytes());w.close()
fade=np.minimum(1,np.maximum(0,(DUR-np.arange(N)/SR))/1.2)
save(V,'v2/vo_edit.wav',.95);save(M*fade,'v2/music.wav',.9);save(F*fade,'v2/sfx.wav',.9)
