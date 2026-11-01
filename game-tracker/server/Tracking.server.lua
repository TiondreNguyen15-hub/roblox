local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local shared = ReplicatedStorage:WaitForChild("PlayerTracking")
local Config = require(shared:WaitForChild("Config"))
local Rig = require(shared:WaitForChild("Rig"))
local HttpBridge = require(script.Parent.HttpBridge)
local snapshot = Instance.new("RemoteEvent")
snapshot.Name = "Snapshot"
snapshot.Parent = shared

local function allowed(player)
	if RunService:IsStudio() or Config.AllowAllViewers then return true end
	if game.CreatorType == Enum.CreatorType.User and player.UserId == game.CreatorId then return true end
	return table.find(Config.AllowedUserIds, player.UserId) ~= nil
end

local sequence = 0
local spawnSequence = 0
local characters = {}
Players.PlayerRemoving:Connect(function(player) characters[player.UserId] = nil end)
local accumulator = 0
RunService.Heartbeat:Connect(function(dt)
	accumulator += dt
	if accumulator < 1 / math.clamp(Config.SnapshotHz, 1, 30) then return end
	accumulator = 0
	local viewers = {}
	for _, player in ipairs(Players:GetPlayers()) do
		local authorized = allowed(player)
		player:SetAttribute("PlayerTrackingAllowed", authorized)
		if authorized then table.insert(viewers, player) end
	end
	if #viewers == 0 then return end
	local entities = {}
	for _, player in ipairs(Players:GetPlayers()) do
		if Config.MaxTrackedPlayers > 0 and #entities >= Config.MaxTrackedPlayers then break end
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if humanoid and root and root:IsA("BasePart") then
			if not characters[player.UserId] or characters[player.UserId].character ~= character then
				spawnSequence += 1
				characters[player.UserId] = {character = character, generation = spawnSequence}
			end
			local box, size = character:GetBoundingBox()
			local rigType = humanoid.RigType.Name
			table.insert(entities, {
				id = player.UserId, generation = characters[player.UserId].generation,
				name = player.DisplayName, username = player.Name,
				root = root.CFrame, boxOffset = root.CFrame:ToObjectSpace(box), size = size,
				health = humanoid.Health, maxHealth = humanoid.MaxHealth,
				team = player.Team and player.Team.Name or "Neutral",
				teamId = not player.Neutral and player.Team and tostring(player.Team:GetAttribute("TeamId") or player.Team.Name) or "Neutral",
				teamColor = player.TeamColor.Color, neutral = player.Neutral,
				rig = rigType,
				joints = Config.StreamSkeleton and Rig.Sample(character, rigType) or {},
			})
		end
	end
	sequence += 1
	local packet = {sequence = sequence, time = Workspace:GetServerTimeNow(), entities = entities}
	HttpBridge.Push(packet)
	for _, viewer in ipairs(viewers) do snapshot:FireClient(viewer, packet) end
end)
