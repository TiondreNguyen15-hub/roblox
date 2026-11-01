"""Exercise the real lock module with explicit Roblox service/math test doubles."""
from pathlib import Path
import subprocess,sys,tempfile
source=(Path(__file__).parent/'client/CameraLock.lua').read_text()
fixture=r'''
local vec
local mt={}
mt.__sub=function(a,b) return vec(a.X-b.X,a.Y-b.Y,a.Z and a.Z-b.Z or nil) end
mt.__div=function(a,b) return vec(a.X/b,a.Y/b,a.Z and a.Z/b or nil) end
vec=function(x,y,z) return setmetatable({X=x,Y=y,Z=z,Magnitude=math.sqrt(x*x+y*y+(z or 0)^2)},mt) end
local Vector2={new=function(x,y) return vec(x,y) end}
local lastAlpha=nil
local function frame(position,target) return {Position=position,Target=target,Lerp=function(self,goal,alpha) lastAlpha=alpha;return frame(self.Position,goal.Target) end} end
local CFrame={lookAt=function(position,target) return frame(position,target) end}
local Enum={CameraType={Custom='Custom',Scriptable='Scriptable'},RenderPriority={Camera={Value=100}},RaycastFilterType={Exclude='Exclude'}}
local RaycastParams={new=function() return {} end}
local allowed=true
local humanoid={Health=100}
local player={UserId=1,Neutral=false,Team={Name='Blue'},Character={FindFirstChildOfClass=function() return humanoid end},GetAttribute=function() return allowed end}
local camera={ViewportSize=vec(800,600),CameraType='Custom',CFrame=frame(vec(0,0,0)),WorldToViewportPoint=function(_,p) return {X=400+p.X,Y=300-p.Y,Z=-p.Z},p.Z<0 end}
local blocked=false
local workspace={CurrentCamera=camera,GetServerTimeNow=function() return 100 end,Raycast=function() return blocked and {Instance={IsDescendantOf=function() return false end}} or nil end}
local bound,unbound=false,false
local run={BindToRenderStep=function() bound=true end,UnbindFromRenderStep=function() unbound=true end}
local input={InputBegan={Connect=function() return {Disconnect=function() end} end},GetFocusedTextBox=function() return nil end}
local players={GetPlayerByUserId=function() return {Character={}} end}
local game={GetService=function(_,name) return ({Players=players,Workspace=workspace,RunService=run,UserInputService=input})[name] end}
local CameraLock=(function()
SOURCE
end)()
local settings={Enabled=true,MaxDistance=1500}
local config={LockRadiusPixels=150,LockMaxDistance=1500,LockSmoothing=14,LockTeamCheck=true,LockRequireLineOfSight=true}
local function entity(id,x,team) return {id=id,generation=1,health=100,neutral=false,team=team or 'Red',name='Target '..id,root={Position=vec(x,0,-20)},joints={Head=vec(x,2,-20)}} end
local entities={entity(2,5),entity(3,1,'Blue'),entity(4,30)}
local store={Get=function() return entities end}
local lock=CameraLock.new(player,store,settings,config)
assert(bound)
lock:Toggle('snap');assert(lock.target.id==2 and lastAlpha==1)
table.insert(entities,entity(5,1));lock:Step(.016);assert(lock.target.id==2,'persistent lock must not switch targets')
lock:Toggle('snap');assert(lock.target==nil,'same key toggles off')
lock:Toggle('smooth');assert(lock.target.id==5);lock:Step(.016);assert(lastAlpha>0 and lastAlpha<1)
blocked=true;lock:Step(.016);assert(lock.target==nil,'blocked target must release')
blocked=false;lock:Toggle('snap');entities[#entities].generation=2;lock:Step(.016);assert(lock.target==nil,'respawn must release')
allowed=false;lock:Toggle('snap');assert(lock.target==nil)
allowed=true;camera.CameraType='Scriptable';lock:Toggle('snap');assert(lock.target==nil)
camera.CameraType='Custom';lock:Toggle('snap');settings.Enabled=false;lock:Step(.016);assert(lock.target==nil)
settings.Enabled=true;entities={entity(2,200)};lock:Toggle('snap');assert(lock.target==nil,'outside radius')
entities={entity(2,1)};lock:Toggle('snap');entities[1].health=0;lock:Step(.016);assert(lock.target==nil,'dead target')
entities={entity(2,1)};lock:Toggle('snap');entities={};lock:Step(.016);assert(lock.target==nil,'removed/stale target')
lock:Destroy();assert(unbound)
print('PASS: snap/smooth acquisition, team filtering, persistent target, toggle release, line-of-sight, respawn, authorization, camera mode, disable, radius, death/stale removal, binding cleanup. Roblox services/math are test doubles.')
'''
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'camera-lock-test.luau';p.write_text(fixture.replace('SOURCE',source));subprocess.run([sys.argv[1] if len(sys.argv)>1 else 'luau',str(p)],check=True)
