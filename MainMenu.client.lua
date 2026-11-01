-- Place this LocalScript in StarterPlayer > StarterPlayerScripts.
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local player = Players.LocalPlayer
local blue = Color3.fromRGB(30, 131, 255)

local function make(class, properties, parent)
	local object = Instance.new(class)
	for key, value in pairs(properties) do object[key] = value end
	object.Parent = parent
	return object
end

local function round(object, radius)
	make("UICorner", {CornerRadius = UDim.new(0, radius)}, object)
end

local gui = make("ScreenGui", {
	Name = "MainMenu", ResetOnSpawn = false, IgnoreGuiInset = true,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, player:WaitForChild("PlayerGui"))

local background = make("Frame", {
	Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(7, 10, 16),
	BorderSizePixel = 0,
}, gui)
make("UIGradient", {
	Color = ColorSequence.new(Color3.fromRGB(7, 10, 16), Color3.fromRGB(13, 29, 49)),
	Rotation = 35,
}, background)

local card = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.new(0.88, 0, 0, 420), BackgroundColor3 = Color3.fromRGB(12, 17, 26),
	BorderSizePixel = 0,
}, background)
round(card, 24)
make("UISizeConstraint", {MaxSize = Vector2.new(400, 420)}, card)
make("UIStroke", {Color = Color3.fromRGB(35, 62, 93), Thickness = 1}, card)
local scale = make("UIScale", {}, card)
local function fit()
	scale.Scale = math.min(1, math.max(0.1, (gui.AbsoluteSize.Y - 32) / 420))
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(fit)
fit()

local function label(text, y, size, color)
	return make("TextLabel", {
		BackgroundTransparency = 1, Position = UDim2.new(0, 24, 0, y),
		Size = UDim2.new(1, -48, 0, 36), Text = text,
		TextColor3 = color, TextSize = size, Font = Enum.Font.GothamBold,
	}, card)
end

local title = label("YOUR GAME", 35, 30, Color3.fromRGB(244, 248, 255))
local subtitle = label("Ready when you are.", 75, 14, Color3.fromRGB(137, 157, 184))
subtitle.Font = Enum.Font.Gotham
local menu = make("Frame", {
	BackgroundTransparency = 1, Position = UDim2.new(0, 28, 0, 143),
	Size = UDim2.new(1, -56, 0, 216),
}, card)
make("UIListLayout", {Padding = UDim.new(0, 12), SortOrder = Enum.SortOrder.LayoutOrder}, menu)

local function button(text, parent, primary)
	local base = primary and blue or Color3.fromRGB(22, 32, 48)
	local control = make("TextButton", {
		Size = UDim2.new(1, 0, 0, 56), BackgroundColor3 = base,
		BorderSizePixel = 0, Text = text, TextColor3 = Color3.new(1, 1, 1),
		TextSize = 16, Font = Enum.Font.GothamBold, AutoButtonColor = false,
		Selectable = true,
	}, parent)
	round(control, 14)
	local function highlight(active)
		TweenService:Create(control, TweenInfo.new(0.15), {
			BackgroundColor3 = active and base:Lerp(Color3.new(1, 1, 1), 0.12) or base,
		}):Play()
	end
	control.MouseEnter:Connect(function() highlight(true) end)
	control.MouseLeave:Connect(function() highlight(false) end)
	control.SelectionGained:Connect(function() highlight(true) end)
	control.SelectionLost:Connect(function() highlight(false) end)
	return control
end

local play = button("PLAY", menu, true)
local settings = button("SETTINGS", menu, false)
local credits = button("CREDITS", menu, false)
label("MAIN MENU", 375, 11, Color3.fromRGB(78, 111, 150))

local panel = make("Frame", {
	Visible = false, BackgroundTransparency = 1,
	Position = UDim2.new(0, 28, 0, 143), Size = UDim2.new(1, -56, 0, 216),
}, card)
local detail = make("TextLabel", {
	BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 100),
	Text = "", TextWrapped = true, TextColor3 = Color3.fromRGB(164, 183, 207),
	TextSize = 16, Font = Enum.Font.Gotham,
}, panel)
local shadows = button("", panel, false)
shadows.Position = UDim2.fromOffset(0, 90)
local back = button("BACK", panel, true)
back.Position = UDim2.fromOffset(0, 158)

local function shadowText()
	shadows.Text = "SHADOWS: " .. (Lighting.GlobalShadows and "ON" or "OFF")
end
local function openPanel(name)
	menu.Visible = false
	panel.Visible = true
	title.Text = name
	subtitle.Text = name == "SETTINGS" and "Make yourself comfortable." or "Thanks for playing."
	shadows.Visible = name == "SETTINGS"
	detail.Text = name == "SETTINGS" and "Toggle shadows for this session." or "Made with Roblox Studio.\n\nYour adventure starts here."
	shadowText()
end
settings.Activated:Connect(function() openPanel("SETTINGS") end)
credits.Activated:Connect(function() openPanel("CREDITS") end)
shadows.Activated:Connect(function()
	Lighting.GlobalShadows = not Lighting.GlobalShadows
	shadowText()
end)
back.Activated:Connect(function()
	panel.Visible = false
	menu.Visible = true
	title.Text = "YOUR GAME"
	subtitle.Text = "Ready when you are."
end)
play.Activated:Connect(function()
	-- Add your game's local start behavior here if needed.
	gui:Destroy()
end)
