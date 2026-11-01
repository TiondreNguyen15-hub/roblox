local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(script.Parent.ExportConfig)
local Bridge = {}
local latest, cameras = nil, {}
local gameName = nil
local shared = ReplicatedStorage:WaitForChild("PlayerTracking")
local remote = Instance.new("RemoteEvent")
remote.Name = "DesktopBridge"
remote.Parent = shared
local function vector(v) return {v.X,v.Y,v.Z} end
local function frame(cf) return {cf:GetComponents()} end
local function authorized(player) return player:GetAttribute("PlayerTrackingAllowed") == true end
remote.OnServerEvent:Connect(function(player, cf, viewport, fov)
	if not Config.Enabled or not authorized(player) then return end
	local old = cameras[player.UserId]
	if old and os.clock()-old.time < 0.15 then return end
	if typeof(cf) ~= "CFrame" or typeof(viewport) ~= "Vector2" or typeof(fov) ~= "number" then return end
	if viewport.X ~= viewport.X or viewport.Y ~= viewport.Y then return end
	if fov ~= fov or fov < 1 or fov > 120 or viewport.X < 1 or viewport.Y < 1 or viewport.X > 8192 or viewport.Y > 8192 then return end
	for _, value in ipairs(frame(cf)) do if value ~= value or math.abs(value)>1e8 then return end end
	cameras[player.UserId] = {time=os.clock(),camera={cframe=frame(cf),viewport={viewport.X,viewport.Y},fov=fov}}
end)
Players.PlayerRemoving:Connect(function(player) cameras[player.UserId]=nil end)
function Bridge.Push(packet) latest=packet end
if Config.Enabled then
	task.spawn(function() local ok, info=pcall(function() return game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId) end);if ok and type(info.Name)=="string" then gameName=info.Name end end)
	assert(Config.RelayUrl:match("^https://"), "Player Data relay must use public HTTPS")
	task.spawn(function()
		local delay = 1/math.clamp(Config.PublishHz,1,3)
		local failed = false
		while true do
			task.wait(delay)
			local packet = latest
			if not packet then continue end
			local viewers, present = {}, {}
			for _, entity in ipairs(packet.entities) do present[entity.id]=true end
			for _, player in ipairs(Players:GetPlayers()) do
				local camera = cameras[player.UserId]
				if authorized(player) and present[player.UserId] and camera and os.clock()-camera.time<2 and #viewers<Config.MaxViewers then
					table.insert(viewers,{userId=player.UserId,camera=camera.camera})
				end
			end
			if #viewers == 0 then continue end
			local entities = {}
			for _, entity in ipairs(packet.entities) do
				local joints={}
				for name,position in pairs(entity.joints) do joints[name]=vector(position) end
				local cf=frame(entity.root)
				table.insert(entities,{userId=entity.id,username=entity.username,displayName=entity.name,
					position=vector(entity.root.Position),rotation={table.unpack(cf,4,12)},
					box=frame(entity.root*entity.boxOffset),size=vector(entity.size),health=math.max(0,entity.health),maxHealth=math.max(1,entity.maxHealth),
					teamId=entity.teamId,rig=entity.rig,joints=joints})
			end
			local ok,response=pcall(function()
				return HttpService:RequestAsync({Url=Config.RelayUrl.."/v1/publish",Method="POST",
					Headers={["Content-Type"]="application/json",Authorization=HttpService:GetSecret(Config.SecretName):AddPrefix("Bearer ")},
					Body=HttpService:JSONEncode({version=1,sequence=packet.sequence,game={universeId=game.GameId,placeId=game.PlaceId,jobId=game.JobId,name=gameName},
						connectedCount=#Players:GetPlayers(),players=entities,viewers=viewers})})
			end)
			if ok and response.Success then
				local decodedOk,data=pcall(function() return HttpService:JSONDecode(response.Body) end)
				if decodedOk and type(data.pairCodes)=="table" then
					for _, player in ipairs(Players:GetPlayers()) do
						local code=data.pairCodes[tostring(player.UserId)]
						if authorized(player) and type(code)=="string" then remote:FireClient(player,code) end
					end
				end
				failed=false;delay=1/math.clamp(Config.PublishHz,1,3)
			else
				if not failed then warn("Player Data relay unavailable. Check relay URL, HTTP settings and Creator Hub secret; retrying.") end
				failed=true;delay=math.min(15,delay*2)
			end
		end
	end)
end
return Bridge
