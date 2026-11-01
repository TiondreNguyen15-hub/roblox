local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local UI = require(script.Parent.UI)
local Store = require(script.Parent.Store)
local Renderer = require(script.Parent.Renderer)
local Skeleton = require(script.Parent.Skeleton)
local Radar = require(script.Parent.Radar)
local Menu = require(script.Parent.Menu)
local CameraLock = require(script.Parent.CameraLock)
local WallHighlights = require(script.Parent.WallHighlights)
local shared = ReplicatedStorage:WaitForChild("PlayerTracking")
local Config = require(shared:WaitForChild("Config"))
local player = Players.LocalPlayer
local settings = table.clone(Config.Defaults)
settings.Colors = table.clone(Config.Colors)
settings.RadarRange, settings.RadarSize, settings.MaxDistance = Config.RadarRange, Config.RadarSize, Config.MaxDistance
local gui = UI.Make("ScreenGui", {Name = "PlayerTracking", ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = 10, ZIndexBehavior = Enum.ZIndexBehavior.Sibling}, player:WaitForChild("PlayerGui"))
local drawing = UI.Make("Frame", {Size = UDim2.fromScale(1,1), BackgroundTransparency = 1}, gui)
local radarLayer = UI.Make("Frame", {Size = UDim2.fromScale(1,1), BackgroundTransparency = 1, ZIndex = 2}, gui)
local menuLayer = UI.Make("Frame", {Size = UDim2.fromScale(1,1), BackgroundTransparency = 1, ZIndex = 5}, gui)
local renderer = Renderer.new(drawing)
renderer:RegisterFeature("Skeleton", function(parent) return Skeleton.new(parent) end)
renderer:RegisterFeature("WallHighlights", function() return WallHighlights.new() end)
local store = Store.new(Config)
local cameraLock = CameraLock.new(player, store, settings, Config)
local radar, menu = Radar.new(radarLayer), Menu.new(menuLayer, settings, Config, cameraLock)
local snapshotConnection = shared:WaitForChild("Snapshot").OnClientEvent:Connect(function(packet) store:Push(packet) end)
local elapsed = 0
local renderConnection = RunService.RenderStepped:Connect(function(dt)
	elapsed += dt
	if elapsed < 1/math.clamp(Config.RenderHz, 1, 60) then return end
	elapsed = 0
	menu:SetLockStatus(cameraLock:GetStatus())
	local camera = Workspace.CurrentCamera
	local authorized = player:GetAttribute("PlayerTrackingAllowed") == true
	if not camera or not authorized or not settings.Enabled then
		renderer:Clear(); radar:Clear()
		menu:SetStatus(not authorized and "Not authorized by server" or "Tracking disabled")
		return
	end
	local localRoot = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	local origin = localRoot and localRoot.Position or camera.CFrame.Position
	local candidates = {}
	for _, entity in ipairs(store:Get(Workspace:GetServerTimeNow())) do
		local sameTeam = not player.Neutral and not entity.neutral and player.Team and player.Team.Name == entity.team
		if entity.id ~= player.UserId and (settings.ShowTeammates or not sameTeam) then
			local distance = (entity.root.Position-origin).Magnitude
			if distance <= settings.MaxDistance then entity.distance = distance; table.insert(candidates, entity) end
		end
	end
	table.sort(candidates, function(a,b) return a.distance < b.distance end)
	local visible = {}
	for index = 1, math.min(#candidates, Config.MaxRenderedPlayers) do visible[index] = candidates[index] end
	renderer:Update(visible, camera, settings, origin)
	radar:Update(candidates, camera, settings, origin)
	menu:SetStatus(string.format("%d tracked · %d render budget", #candidates, #visible))
end)
script.Destroying:Connect(function()
	snapshotConnection:Disconnect(); renderConnection:Disconnect()
	cameraLock:Destroy()
	renderer:Clear(); radar:Clear(); menu:Destroy(); gui:Destroy()
end)
