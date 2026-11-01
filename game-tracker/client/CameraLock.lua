local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local CameraLock = {}
CameraLock.__index = CameraLock
function CameraLock.new(player, store, settings, config)
	local self = setmetatable({player=player,store=store,settings=settings,config=config,target=nil,mode=nil,status="Camera lock: OFF"}, CameraLock)
	self.binding = "AuthorizedCameraLock_" .. player.UserId
	self.input = UserInputService.InputBegan:Connect(function(input, processed)
		if processed or UserInputService:GetFocusedTextBox() then return end
		if input.KeyCode == config.SnapLockKey then self:Toggle("snap") end
		if input.KeyCode == config.TargetLockKey then self:Toggle("smooth") end
		if input.KeyCode == config.ReleaseLockKey then self:Release("Released") end
	end)
	RunService:BindToRenderStep(self.binding, Enum.RenderPriority.Camera.Value + 1, function(dt) self:Step(dt) end)
	return self
end
function CameraLock:Release(reason)
	self.target=nil;self.mode=nil;self.status="Camera lock: OFF" .. (reason and " · "..reason or "")
end
function CameraLock:Ready()
	if self.player:GetAttribute("PlayerTrackingAllowed") ~= true or not self.settings.Enabled then return false end
	local humanoid = self.player.Character and self.player.Character:FindFirstChildOfClass("Humanoid")
	local camera = Workspace.CurrentCamera
	return humanoid ~= nil and humanoid.Health > 0 and camera ~= nil and camera.CameraType == Enum.CameraType.Custom
end
function CameraLock:Eligible(entity, camera)
	if entity.id == self.player.UserId or entity.health <= 0 then return false end
	if self.config.LockTeamCheck and not self.player.Neutral and not entity.neutral and self.player.Team and self.player.Team.Name == entity.team then return false end
	return (entity.root.Position-camera.CFrame.Position).Magnitude <= math.min(self.settings.MaxDistance,self.config.LockMaxDistance)
end
function CameraLock:Point(entity) return entity.joints.Head or entity.root.Position end
function CameraLock:Visible(entity, camera)
	if not self.config.LockRequireLineOfSight then return true end
	local targetPlayer = Players:GetPlayerByUserId(entity.id)
	local character = targetPlayer and targetPlayer.Character
	if not character then return false end
	local parameters = RaycastParams.new()
	parameters.FilterType = Enum.RaycastFilterType.Exclude
	parameters.FilterDescendantsInstances = self.player.Character and {self.player.Character} or {}
	local result = Workspace:Raycast(camera.CFrame.Position, self:Point(entity)-camera.CFrame.Position, parameters)
	return result == nil or result.Instance:IsDescendantOf(character)
end
function CameraLock:Toggle(mode)
	if self.mode == mode and self.target then self:Release("Released"); return end
	if not self:Ready() then self:Release("Authorization, live character, and Custom camera required"); return end
	local camera = Workspace.CurrentCamera
	local center = camera.ViewportSize/2
	local best, score = nil, self.config.LockRadiusPixels
	for _, entity in ipairs(self.store:Get(Workspace:GetServerTimeNow())) do
		if self:Eligible(entity,camera) and self:Visible(entity,camera) then
			local point, onScreen = camera:WorldToViewportPoint(self:Point(entity))
			if onScreen and point.Z > 0.1 then
				local distance = (Vector2.new(point.X,point.Y)-center).Magnitude
				if distance < score then best=entity;score=distance end
			end
		end
	end
	if not best then self:Release("No eligible target inside selection radius"); return end
	self.target={id=best.id,generation=best.generation};self.mode=mode
	self.status=(mode=="snap" and "Snap lock: " or "Target lock: ") .. best.name
	self:Step(0)
end
function CameraLock:Step(dt)
	if not self.target then return end
	if not self:Ready() then self:Release("Tracking disabled, character unavailable, or camera changed"); return end
	local camera=Workspace.CurrentCamera
	local selected=nil
	for _, entity in ipairs(self.store:Get(Workspace:GetServerTimeNow())) do if entity.id==self.target.id then selected=entity;break end end
	if not selected or selected.generation~=self.target.generation or not self:Eligible(selected,camera) or not self:Visible(selected,camera) then self:Release("Target unavailable");return end
	local point = self:Point(selected)
	if (point-camera.CFrame.Position).Magnitude < 0.01 then self:Release("Target too close");return end
	local goal=CFrame.lookAt(camera.CFrame.Position,point)
	local alpha=self.mode=="snap" and 1 or 1-math.exp(-self.config.LockSmoothing*math.max(0,dt))
	camera.CFrame=camera.CFrame:Lerp(goal,alpha)
end
function CameraLock:GetStatus() return self.status end
function CameraLock:Destroy()
	self:Release();self.input:Disconnect();RunService:UnbindFromRenderStep(self.binding)
end
return CameraLock
