local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local Walls = {}
Walls.__index = Walls
function Walls.new()
	local highlight = Instance.new("Highlight")
	highlight.Name = "AuthorizedTrackingHighlight"
	highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
	highlight.FillTransparency = 0.8
	highlight.OutlineTransparency = 0
	highlight.Enabled = false
	highlight.Parent = Workspace
	return setmetatable({highlight = highlight}, Walls)
end
function Walls:Hide() self.highlight.Enabled = false end
function Walls:Update(entity, _camera, settings)
	local player = Players:GetPlayerByUserId(entity.id)
	local character = player and player.Character
	self.highlight.Adornee = character
	self.highlight.FillColor = settings.Colors.Wall
	self.highlight.OutlineColor = settings.Colors.Box
	self.highlight.Enabled = settings.WallHighlights and character ~= nil
end
function Walls:Destroy() self.highlight:Destroy() end
return Walls
