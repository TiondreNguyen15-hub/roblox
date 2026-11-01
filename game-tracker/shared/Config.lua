-- Server-owned settings. Add production viewers explicitly; Studio is allowed.
return {
	AllowAllViewers = false,
	AllowedUserIds = {}, -- Example: {12345678, 87654321}
	SnapshotHz = 10,
	StreamSkeleton = true,
	MaxTrackedPlayers = 0, -- 0 streams all connected characters; set a cap if needed.
	RenderHz = 30,
	MaxRenderedPlayers = 32,
	MaxDistance = 1500, -- studs
	InterpolationDelay = 0.15,
	StaleAfter = 2,
	RadarRange = 300,
	RadarSize = 180,
	MenuKey = Enum.KeyCode.RightShift,
	SnapLockKey = Enum.KeyCode.Q,
	TargetLockKey = Enum.KeyCode.T,
	ReleaseLockKey = Enum.KeyCode.X,
	LockRadiusPixels = 150,
	LockMaxDistance = 1500,
	LockSmoothing = 14,
	LockTeamCheck = true,
	LockRequireLineOfSight = true,
	Colors = {
		Box = Color3.fromRGB(39, 136, 255),
		Text = Color3.fromRGB(235, 244, 255),
		Skeleton = Color3.fromRGB(112, 255, 208),
		Radar = Color3.fromRGB(39, 136, 255),
		Wall = Color3.fromRGB(39, 136, 255),
	},
	Defaults = {
		Enabled = true, Boxes = true, Names = true, Distance = true,
		Health = true, Team = true, Skeleton = true, Radar = true, WallHighlights = true,
		UseTeamColors = true, ShowTeammates = true,
	},
}
