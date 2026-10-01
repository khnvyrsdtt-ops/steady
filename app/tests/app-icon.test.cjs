'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');

const repo=path.join(__dirname,'..','..');
const tool=path.join(repo,'app/tools/build-home-icon.py');
const iconset=path.join(repo,'ios/Steady/Assets.xcassets/AppIcon.appiconset');

test('all Home Screen icon appearances match the canonical generator',()=>{
  assert.match(execFileSync('python3',[tool,'--check'],{encoding:'utf8'}),/is current/);
});

test('light, dark and tinted icons preserve the same centred S silhouette',()=>{
  const result=execFileSync('python3',['-c',`
import sys
from PIL import Image,ImageChops
light=Image.open(sys.argv[1]).convert('RGB')
dark=Image.open(sys.argv[2]).convert('RGB')
tinted=Image.open(sys.argv[3]).convert('RGBA')
assert all(im.size==(1024,1024) for im in (light,dark,tinted))
assert ImageChops.difference(light,dark).getbbox() is None, 'the light glass tile must remain consistent across themes'
assert min(light.getpixel((4,4)))>210, 'the background must remain light enough to show its darker shading'
assert tinted.getpixel((4,4))[3]==0
assert tinted.getpixel((512,210))==(255,255,255,255)
assert tinted.getchannel('A').getbbox() is not None
assert tinted.getchannel('A').getbbox()[0]>100
assert tinted.getchannel('A').getbbox()[2]<925
assert ImageChops.difference(tinted.getchannel('A'),tinted.getchannel('A').rotate(180)).getbbox() is None
solid=tinted.getchannel('A').point(lambda value:255 if value>=128 else 0)
bounds=solid.getbbox()
upper=solid.crop((0,bounds[1],1024,bounds[1]+5)).getbbox()
lower=solid.crop((0,bounds[3]-5,1024,bounds[3])).getbbox()
assert upper==lower and upper[0]+upper[2]==1024, 'the bowl peaks must align on the icon centre'
rows=[]
for y in range(496,529):
    xs=[x for x in range(1024) if solid.getpixel((x,y))]
    rows.append((y,xs[0],xs[-1]))
for side in (1,2):
    ym=sum(p[0] for p in rows)/len(rows)
    xm=sum(p[side] for p in rows)/len(rows)
    slope=sum((p[0]-ym)*(p[side]-xm) for p in rows)/sum((p[0]-ym)**2 for p in rows)
    assert max(abs(p[side]-(xm+slope*(p[0]-ym))) for p in rows)<0.55, 'the middle edge must stay straight'
for size in (60,120,180):
    alpha=tinted.resize((size,size),Image.Resampling.LANCZOS).getchannel('A')
    assert alpha.point(lambda value:255 if value>=128 else 0).getbbox() is not None
    assert ImageChops.difference(alpha,alpha.rotate(180)).getbbox() is None
# The silhouette is exactly symmetric; the tile has a directional light source.
print('monogram stays legible')
`,path.join(iconset,'AppIcon.png'),path.join(iconset,'AppIcon-dark.png'),path.join(iconset,'AppIcon-tinted.png')],{encoding:'utf8'});
  assert.match(result,/legible/);
});
