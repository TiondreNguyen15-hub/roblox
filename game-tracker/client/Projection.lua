local Projection = {}
function Projection.Point(camera, position)
	local point, visible = camera:WorldToViewportPoint(position)
	return Vector2.new(point.X, point.Y), visible and point.Z > 0.1
end
function Projection.Box(camera, cf, size)
	local minimum = Vector2.new(math.huge, math.huge)
	local maximum = Vector2.new(-math.huge, -math.huge)
	for _, x in ipairs({-1, 1}) do
		for _, y in ipairs({-1, 1}) do
			for _, z in ipairs({-1, 1}) do
				local corner = cf:PointToWorldSpace(Vector3.new(size.X*x/2, size.Y*y/2, size.Z*z/2))
				local point = camera:WorldToViewportPoint(corner)
				-- Reject boxes crossing the near plane rather than draw huge inverted rectangles.
				if point.Z <= 0.1 then return nil end
				minimum = Vector2.new(math.min(minimum.X, point.X), math.min(minimum.Y, point.Y))
				maximum = Vector2.new(math.max(maximum.X, point.X), math.max(maximum.Y, point.Y))
			end
		end
	end
	local viewport = camera.ViewportSize
	if maximum.X < 0 or maximum.Y < 0 or minimum.X > viewport.X or minimum.Y > viewport.Y then return nil end
	minimum = Vector2.new(math.max(0, minimum.X), math.max(0, minimum.Y))
	maximum = Vector2.new(math.min(viewport.X, maximum.X), math.min(viewport.Y, maximum.Y))
	return minimum, maximum - minimum
end
return Projection
