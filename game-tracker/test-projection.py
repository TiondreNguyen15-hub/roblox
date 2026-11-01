"""Exercise the real projection module with a synthetic camera, without Studio."""
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent
source = (root / "client/Projection.lua").read_text()
fixture = r'''
local v2 = {}
v2.__sub = function(a,b) return setmetatable({X=a.X-b.X,Y=a.Y-b.Y},v2) end
local Vector2 = {new=function(x,y) return setmetatable({X=x,Y=y},v2) end}
local Vector3 = {new=function(x,y,z) return {X=x,Y=y,Z=z} end}
local Projection = (function()
SOURCE
end)()
local camera = {ViewportSize=Vector2.new(100,100)}
function camera:WorldToViewportPoint(p)
 return p, p.X>=0 and p.X<=100 and p.Y>=0 and p.Y<=100 and p.Z>0
end
local function transform(x,y,z)
 return {PointToWorldSpace=function(_,p) return Vector3.new(p.X+x,p.Y+y,p.Z+z) end}
end
local top,size=Projection.Box(camera,transform(50,50,10),Vector3.new(20,40,2))
assert(top.X==40 and top.Y==30 and size.X==20 and size.Y==40)
top,size=Projection.Box(camera,transform(0,50,10),Vector3.new(20,20,2))
assert(top.X==0 and size.X==10)
assert(Projection.Box(camera,transform(150,50,10),Vector3.new(20,20,2))==nil)
assert(Projection.Box(camera,transform(50,50,0),Vector3.new(20,20,2))==nil)
local _,visible=Projection.Point(camera,Vector3.new(50,50,-1))
assert(not visible)
print("PASS: projected bounds, viewport clipping, offscreen culling, near-plane rejection, behind-camera points")
'''
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / "projection-test.luau"
    path.write_text(fixture.replace("SOURCE", source))
    subprocess.run([sys.argv[1] if len(sys.argv) > 1 else "luau", str(path)], check=True)
