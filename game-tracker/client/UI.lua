local UI = {}
function UI.Make(class, properties, parent)
	local object = Instance.new(class)
	for key, value in pairs(properties) do object[key] = value end
	object.Parent = parent
	return object
end
function UI.Line(parent)
	return UI.Make("Frame", {BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0.5), Visible = false}, parent)
end
function UI.SetLine(line, first, last, color)
	local delta = last - first
	line.Position = UDim2.fromOffset((first.X+last.X)/2, (first.Y+last.Y)/2)
	line.Size = UDim2.fromOffset(delta.Magnitude, 2)
	line.Rotation = math.deg(math.atan2(delta.Y, delta.X))
	line.BackgroundColor3 = color
	line.Visible = true
end
return UI
