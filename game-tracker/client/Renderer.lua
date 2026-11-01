local UI = require(script.Parent.UI)
local Projection = require(script.Parent.Projection)
local Renderer = {}
Renderer.__index = Renderer
function Renderer.new(parent)
	return setmetatable({parent = parent, entries = {}, factories = {}}, Renderer)
end
-- Register before the first Update. A feature implements Update, Hide and Destroy.
function Renderer:RegisterFeature(name, factory)
	assert(next(self.entries) == nil, "Register features before rendering begins")
	self.factories[name] = factory
end
function Renderer:Create()
	local entry = {features = {}}
	entry.box = UI.Make("Frame", {BackgroundTransparency = 1, BorderSizePixel = 0, Visible = false}, self.parent)
	entry.stroke = UI.Make("UIStroke", {Thickness = 1.5}, entry.box)
	entry.info = UI.Make("TextLabel", {
		BackgroundTransparency = 1, Size = UDim2.fromOffset(240, 58), AnchorPoint = Vector2.new(0.5, 1),
		Font = Enum.Font.GothamMedium, TextSize = 12, TextStrokeTransparency = 0.25,
		TextYAlignment = Enum.TextYAlignment.Bottom, Visible = false,
	}, self.parent)
	entry.health = UI.Make("Frame", {BackgroundColor3 = Color3.fromRGB(18, 23, 30), BorderSizePixel = 0, Visible = false}, self.parent)
	entry.fill = UI.Make("Frame", {BorderSizePixel = 0, AnchorPoint = Vector2.new(0, 1), Position = UDim2.fromScale(0, 1)}, entry.health)
	for name, factory in pairs(self.factories) do entry.features[name] = factory(self.parent) end
	return entry
end
function Renderer:HideEntry(entry)
	entry.box.Visible, entry.info.Visible, entry.health.Visible = false, false, false
	for _, feature in pairs(entry.features) do feature:Hide() end
end
function Renderer:Update(entities, camera, settings, origin)
	local used = {}
	for _, entity in ipairs(entities) do
		used[entity.id] = true
		local entry = self.entries[entity.id]
		if not entry then entry = self:Create(); self.entries[entity.id] = entry end
		self:HideEntry(entry)
		local top, size = Projection.Box(camera, entity.root * entity.boxOffset, entity.size)
		if top then
			local color = settings.UseTeamColors and not entity.neutral and entity.teamColor or settings.Colors.Box
			entry.box.Position, entry.box.Size = UDim2.fromOffset(top.X, top.Y), UDim2.fromOffset(size.X, size.Y)
			entry.stroke.Color, entry.box.Visible = color, settings.Boxes
			local lines = {}
			if settings.Names then table.insert(lines, entity.name .. " (@" .. entity.username .. ")") end
			local details = {}
			if settings.Team then table.insert(details, entity.team) end
			if settings.Distance then table.insert(details, string.format("%.0f studs", (entity.root.Position-origin).Magnitude)) end
			if #details > 0 then table.insert(lines, table.concat(details, " · ")) end
			if settings.Health then table.insert(lines, string.format("HP %.0f / %.0f", entity.health, entity.maxHealth)) end
			entry.info.Text, entry.info.TextColor3 = table.concat(lines, "\n"), settings.Colors.Text
			entry.info.Position = UDim2.fromOffset(top.X+size.X/2, math.max(58, top.Y-5))
			entry.info.Visible = #lines > 0
			entry.health.Position, entry.health.Size = UDim2.fromOffset(top.X-7, top.Y), UDim2.fromOffset(3, size.Y)
			local ratio = math.clamp(entity.health/math.max(1, entity.maxHealth), 0, 1)
			entry.fill.Size = UDim2.fromScale(1, ratio)
			entry.fill.BackgroundColor3 = Color3.fromRGB(255, 80, 90):Lerp(Color3.fromRGB(90, 230, 140), ratio)
			entry.health.Visible = settings.Health
			for _, feature in pairs(entry.features) do feature:Update(entity, camera, settings) end
		end
	end
	for id, entry in pairs(self.entries) do
		if not used[id] then
			for _, feature in pairs(entry.features) do feature:Destroy() end
			entry.box:Destroy(); entry.info:Destroy(); entry.health:Destroy()
			self.entries[id] = nil
		end
	end
end
function Renderer:Clear()
	self:Update({}, nil, nil, nil)
end
return Renderer
