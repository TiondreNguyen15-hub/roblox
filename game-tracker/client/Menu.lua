local UserInputService = game:GetService("UserInputService")
local UI = require(script.Parent.UI)
local Menu = {}
function Menu.new(parent, settings, config)
	local self = {}
	local button = UI.Make("TextButton", {
		Text = "TRACKING · MENU", Font = Enum.Font.GothamBold, TextSize = 12,
		Size = UDim2.fromOffset(170, 38), AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1,-20,0,50),
		BackgroundColor3 = Color3.fromRGB(20, 53, 90), TextColor3 = Color3.new(1,1,1), BorderSizePixel = 0,
	}, parent)
	UI.Make("UICorner", {CornerRadius = UDim.new(0,12)}, button)
	local panel = UI.Make("Frame", {
		Size = UDim2.new(0, 290, 0.72, 0), AnchorPoint = Vector2.new(1,0), Position = UDim2.new(1,-20,0,100),
		BackgroundColor3 = Color3.fromRGB(10,17,28), BorderSizePixel = 0, Visible = false,
	}, parent)
	UI.Make("UISizeConstraint", {MaxSize = Vector2.new(290,650)}, panel)
	UI.Make("UICorner", {CornerRadius = UDim.new(0,16)}, panel)
	UI.Make("UIStroke", {Color = Color3.fromRGB(35,70,110)}, panel)
	local scroll = UI.Make("ScrollingFrame", {
		Size = UDim2.new(1,-24,1,-24), Position = UDim2.fromOffset(12,12), BackgroundTransparency = 1,
		BorderSizePixel = 0, ScrollBarThickness = 3, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y,
	}, panel)
	UI.Make("UIListLayout", {Padding = UDim.new(0,7), SortOrder = Enum.SortOrder.LayoutOrder}, scroll)
	local order = 0
	local function row(text, callback)
		order += 1
		local control = UI.Make("TextButton", {
			Text = text, Font = Enum.Font.GothamMedium, TextSize = 12, TextColor3 = Color3.fromRGB(225,240,255),
			BackgroundColor3 = Color3.fromRGB(20,32,49), BorderSizePixel = 0,
			Size = UDim2.new(1,-4,0,34), LayoutOrder = order,
		}, scroll)
		UI.Make("UICorner", {CornerRadius = UDim.new(0,9)}, control)
		if callback then control.Activated:Connect(function() callback(control) end) end
		return control
	end
	local status = row("Waiting for server authorization")
	status.AutoButtonColor = false
	for _, key in ipairs({"Enabled","Boxes","Names","Distance","Health","Team","Skeleton","Radar","UseTeamColors","ShowTeammates"}) do
		local function text() return key .. ": " .. (settings[key] and "ON" or "OFF") end
		row(text(), function(control) settings[key] = not settings[key]; control.Text = text() end)
	end
	local function cycle(key, values, suffix)
		row(key .. ": " .. settings[key] .. suffix, function(control)
			local index = table.find(values, settings[key]) or 0
			settings[key] = values[index % #values + 1]
			control.Text = key .. ": " .. settings[key] .. suffix
		end)
	end
	cycle("RadarRange", {100,300,500,1000}, " studs")
	cycle("RadarSize", {140,180,220}, " px")
	cycle("MaxDistance", {300,750,1500,3000}, " studs")
	local palette = {
		Color3.fromRGB(39,136,255), Color3.fromRGB(100,235,255), Color3.fromRGB(112,255,208),
		Color3.fromRGB(255,170,75), Color3.fromRGB(255,110,195), Color3.fromRGB(235,244,255),
	}
	for _, key in ipairs({"Box","Text","Skeleton","Radar"}) do
		local control = row(key .. " color · click to cycle", function(current)
			local index = table.find(palette, settings.Colors[key]) or 0
			settings.Colors[key] = palette[index % #palette + 1]
			current.TextColor3 = settings.Colors[key]
		end)
		control.TextColor3 = settings.Colors[key]
	end
	row("Team colors override box / radar colors").AutoButtonColor = false
	button.Activated:Connect(function() panel.Visible = not panel.Visible end)
	local connection = UserInputService.InputBegan:Connect(function(input, processed)
		if not processed and input.KeyCode == config.MenuKey then panel.Visible = not panel.Visible end
	end)
	function self:SetStatus(text) status.Text = text end
	function self:Destroy() connection:Disconnect(); panel:Destroy(); button:Destroy() end
	return self
end
return Menu
