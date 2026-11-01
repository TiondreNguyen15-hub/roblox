local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Rig = require(ReplicatedStorage:WaitForChild("PlayerTracking"):WaitForChild("Rig"))
local UI = require(script.Parent.UI)
local Projection = require(script.Parent.Projection)
local Skeleton = {}
Skeleton.__index = Skeleton
function Skeleton.new(parent)
	local self = setmetatable({lines = {}}, Skeleton)
	for _ = 1, 14 do table.insert(self.lines, UI.Line(parent)) end
	return self
end
function Skeleton:Hide()
	for _, line in ipairs(self.lines) do line.Visible = false end
end
function Skeleton:Update(entity, camera, settings)
	self:Hide()
	if not settings.Skeleton then return end
	for index, link in ipairs(Rig.Links[entity.rig] or {}) do
		local first, last = entity.joints[link[1]], entity.joints[link[2]]
		if first and last then
			local a, aVisible = Projection.Point(camera, first)
			local b, bVisible = Projection.Point(camera, last)
			if aVisible and bVisible then UI.SetLine(self.lines[index], a, b, settings.Colors.Skeleton) end
		end
	end
end
function Skeleton:Destroy()
	for _, line in ipairs(self.lines) do line:Destroy() end
end
return Skeleton
