import numpy as np
from PIL import Image, ImageFilter
rng=np.random.default_rng(7)
W,H=1080,1920
def noise(scale):
    a=rng.random((H//scale+2,W//scale+2)).astype('float32')
    return np.asarray(Image.fromarray((a*255).astype('uint8')).resize((W,H),Image.BICUBIC),dtype='float32')/255
n=sum(noise(s)*w for s,w in [(240,.5),(60,.3),(12,.15),(2,.1)])/1.05
n=(n-n.min())/(n.max()-n.min())
base=np.array([242,233,214],dtype='float32')
img=base[None,None,:]*(0.93+0.10*n[...,None])
# fibras
f=np.zeros((H,W),dtype='float32')
for _ in range(900):
    x,y=rng.integers(0,W),rng.integers(0,H); l=rng.integers(8,40); a=rng.random()*6.28
    for k in range(l):
        xx=int(x+np.cos(a)*k); yy=int(y+np.sin(a)*k)
        if 0<=xx<W and 0<=yy<H: f[yy,xx]=1
f=np.asarray(Image.fromarray((f*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6)),dtype='float32')/255
img=img*(1-0.09*f[...,None])
Image.fromarray(np.clip(img,0,255).astype('uint8')).save('paper.jpg',quality=92)
# grano con sobrescan para desplazarlo por cuadro
g=rng.normal(0,1,(H+200,W+200)).astype('float32')
g=np.asarray(Image.fromarray(((g*40)+128).clip(0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(.7)),dtype='float32')
rgba=np.zeros((H+200,W+200,4),dtype='uint8'); v=np.clip((g-128)*2.2+128,0,255)
rgba[...,0:3]=v[...,None].astype('uint8'); rgba[...,3]=70
Image.fromarray(rgba).save('grain.png')
