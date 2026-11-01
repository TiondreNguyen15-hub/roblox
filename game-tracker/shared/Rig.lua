local Rig = {}
Rig.Links = {
	R15 = {
		{"Head", "UpperTorso"}, {"UpperTorso", "LowerTorso"},
		{"UpperTorso", "LeftUpperArm"}, {"LeftUpperArm", "LeftLowerArm"}, {"LeftLowerArm", "LeftHand"},
		{"UpperTorso", "RightUpperArm"}, {"RightUpperArm", "RightLowerArm"}, {"RightLowerArm", "RightHand"},
		{"LowerTorso", "LeftUpperLeg"}, {"LeftUpperLeg", "LeftLowerLeg"}, {"LeftLowerLeg", "LeftFoot"},
		{"LowerTorso", "RightUpperLeg"}, {"RightUpperLeg", "RightLowerLeg"}, {"RightLowerLeg", "RightFoot"},
	},
	R6 = {
		{"Head", "Torso"}, {"Torso", "Left Arm"}, {"Torso", "Right Arm"},
		{"Torso", "Left Leg"}, {"Torso", "Right Leg"},
	},
}
function Rig.Sample(character, rigType)
	local joints = {}
	for _, link in ipairs(Rig.Links[rigType] or {}) do
		for _, name in ipairs(link) do
			if not joints[name] then
				local part = character:FindFirstChild(name)
				if part and part:IsA("BasePart") then joints[name] = part.Position end
			end
		end
	end
	return joints
end
return Rig
