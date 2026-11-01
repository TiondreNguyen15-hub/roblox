local UI = require(script.Parent.UI)
local Radar = {}
Radar.__index = Radar
function Radar.new(parent)
	local frame = UI.Make("Frame", {
		AnchorPoint = Vector2.new(0, 1), Position = UDim2.new(0, 20, 1, -24),
		BackgroundColor3 = Color3.fromRGB(10, 17, 28), BackgroundTransparency = 0.12, BorderSizePixel = 0,
		ClipsDescendants = true, Visible = false,
	}, parent)
	UI.Make("UICorner", {CornerRadius = UDim.new(1, 0)}, frame)
	UI.Make("UIStroke", {Color = Color3.fromRGB(39, 80, 125)}, frame)
	UI.Make("Frame", {Size = UDim2.new(1, 0, 0, 1), Position = UDim2.fromScale(0, 0.5), BorderSizePixel = 0, BackgroundColor3 = Color3.fromRGB(30, 48, 70)}, frame)
	UI.Make("Frame", {Size = UDim2.new(0, 1, 1, 0), Position = UDim2.fromScale(0.5, 0), BorderSizePixel = 0, BackgroundColor3 = Color3.fromRGB(30, 48, 70)}, frame)
	UI.Make("TextLabel", {Text = "▲", Size = UDim2.fromOffset(16,16), AnchorPoint = Vector2.new(0.5,0.5), Position = UDim2.fromScale(0.5,0.5), BackgroundTransparency = 1, TextColor3 = Color3.new(1,1,1), TextSize = 14, ZIndex = 3}, frame)
	return setmetatable({frame = frame, dots = {}}, Radar)
end
function Radar:Update(entities, camera, settings, origin)
	self.frame.Visible = settings.Enabled and settings.Radar
	if not self.frame.Visible then return end
	local size, range = settings.RadarSize, math.max(1, settings.RadarRange)
	self.frame.Size = UDim2.fromOffset(size, size)
	local look = camera.CFrame.LookVector
	local forward = Vector3.new(look.X, 0, look.Z)
	if forward.Magnitude < 0.001 then forward = Vector3.new(0, 0, -1) else forward = forward.Unit end
	local right = forward:Cross(Vector3.new(0, 1, 0))
	local used = {}
	for _, entity in ipairs(entities) do
		local delta = entity.root.Position-origin
		local planar = Vector3.new(delta.X, 0, delta.Z)
		if planar.Magnitude <= range then
			used[entity.id] = true
			local dot = self.dots[entity.id]
			if not dot then
				dot = UI.Make("TextLabel", {Text = "▲", BackgroundTransparency = 1, Size = UDim2.fromOffset(12,12), AnchorPoint = Vector2.new(0.5,0.5), TextSize = 12, ZIndex = 2}, self.frame)
				self.dots[entity.id] = dot
			end
			dot.Position = UDim2.fromOffset(size/2+planar:Dot(right)/range*(size/2-10), size/2-planar:Dot(forward)/range*(size/2-10))
			local heading = entity.root.LookVector
			dot.Rotation = math.deg(math.atan2(heading:Dot(right), heading:Dot(forward)))
			dot.TextColor3 = settings.UseTeamColors and not entity.neutral and entity.teamColor or settings.Colors.Radar
			dot.Visible = true
		end
	end
	for id, dot in pairs(self.dots) do if not used[id] then dot:Destroy(); self.dots[id] = nil end end
end
function Radar:Clear()
	self.frame.Visible = false
	for id, dot in pairs(self.dots) do dot:Destroy(); self.dots[id] = nil end
end
return Radar
