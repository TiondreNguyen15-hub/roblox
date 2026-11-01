local Store = require("./client/Store")
local function scalar(x)
	return {x=x, Lerp=function(self, other, alpha) return scalar(self.x+(other.x-self.x)*alpha) end}
end
local function entity(id, x, generation)
	return {id=id, generation=generation or 1, root=scalar(x), joints={Head=scalar(x+2)}}
end
local function push(store, sequence, time, entities)
	store:Push({sequence=sequence,time=time,entities=entities})
end
local function close(actual, expected) assert(math.abs(actual-expected)<0.00001, tostring(actual).." ~= "..tostring(expected)) end
local store=Store.new({InterpolationDelay=0.15,StaleAfter=2})
push(store,1,10,{entity(1,0)})
push(store,2,10.1,{entity(1,10)})
local sample=store:Get(10.2)[1]
close(sample.root.x,5);close(sample.joints.Head.x,7)
push(store,1,10.2,{entity(1,999)})
close(store:Get(10.2)[1].root.x,5)
close(store:Get(9)[1].root.x,0)
close(store:Get(10.5)[1].root.x,10)
assert(#store:Get(12.2)==0,"stale entity must disappear")
push(store,3,10.2,{entity(1,100,2)})
close(store:Get(10.2)[1].root.x,100)
push(store,4,10.3,{})
assert(#store:Get(10.3)==0,"removed players must disappear")
for index=5,30 do push(store,index,10+index/10,{entity(2,index,3)}) end
assert(#store.history[2].samples==8,"history must stay bounded")
print("PASS: interpolation, skeleton interpolation, out-of-order packets, endpoint clamping, stale expiry, respawn reset, removal, bounded history")
