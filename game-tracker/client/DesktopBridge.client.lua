local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local RunService=game:GetService("RunService")
local Workspace=game:GetService("Workspace")
local player=Players.LocalPlayer
local remote=ReplicatedStorage:WaitForChild("PlayerTracking"):WaitForChild("DesktopBridge")
local gui=Instance.new("ScreenGui")
gui.Name="DesktopPairing";gui.ResetOnSpawn=false;gui.Parent=player:WaitForChild("PlayerGui")
local label=Instance.new("TextLabel")
label.Size=UDim2.fromOffset(340,44);label.Position=UDim2.new(0.5,-170,0,12)
label.BackgroundColor3=Color3.fromRGB(12,23,39);label.TextColor3=Color3.fromRGB(130,195,255)
label.TextSize=14;label.Font=Enum.Font.GothamMedium;label.Visible=false;label.Parent=gui
local round=Instance.new("UICorner");round.CornerRadius=UDim.new(0,12);round.Parent=label
local lastCodeAt=0
remote.OnClientEvent:Connect(function(code)
	if type(code)~="string" then return end
	label.Text="Desktop pairing: "..code;label.Visible=true;lastCodeAt=os.clock()
end)
local elapsed=0
RunService.Heartbeat:Connect(function(dt)
	elapsed+=dt
	if elapsed<0.2 then return end
	elapsed=0
	if os.clock()-lastCodeAt>5 then label.Visible=false end
	if player:GetAttribute("PlayerTrackingAllowed")~=true then label.Visible=false;return end
	local camera=Workspace.CurrentCamera
	if camera then
		-- Normalize to vertical FOV regardless of the game's FieldOfViewMode.
		local viewport=camera.ViewportSize
		local vertical=camera.FieldOfView
		if camera.FieldOfViewMode==Enum.FieldOfViewMode.Diagonal then
			vertical=math.deg(2*math.atan(math.tan(math.rad(camera.DiagonalFieldOfView)/2)*viewport.Y/math.sqrt(viewport.X^2+viewport.Y^2)))
		elseif camera.FieldOfViewMode==Enum.FieldOfViewMode.MaxAxis and viewport.X>viewport.Y then
			vertical=math.deg(2*math.atan(math.tan(math.rad(camera.MaxAxisFieldOfView)/2)*viewport.Y/viewport.X))
		end
		remote:FireServer(camera.CFrame,viewport,vertical)
	end
end)
