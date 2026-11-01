"""Bundle all game-tracker Lua source into one edit-mode Roblox Studio installer."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / "downloads" / "Roblox-ESP-All-In-One.lua"


def quote(value):
    equals = "="
    while "]" + equals + "]" in value:
        equals += "="
    return "[" + equals + "[\n" + value + "]" + equals + "]"


parts = []
for folder in ("shared", "server", "client"):
    for path in sorted((ROOT / folder).glob("*.lua")):
        suffix = ".server.lua" if path.name.endswith(".server.lua") else ".client.lua" if path.name.endswith(".client.lua") else ".lua"
        kind = {".server.lua": "Script", ".client.lua": "LocalScript", ".lua": "ModuleScript"}[suffix]
        parts.append('{folder="%s",name="%s",class="%s",source=%s}' % (folder, path.name[:-len(suffix)], kind, quote(path.read_text())))

header = '''-- ALL-IN-ONE ROBLOX ESP + CAMERA LOCK INSTALLER
-- Run in Roblox Studio's Command Bar in EDIT mode, in a project you own/are authorized to modify.
-- This does not run in the desktop Lua 5.3 sandbox or in a Roblox game executor.
-- Q: snap lock; T: smooth target lock; X: release; Right Shift: menu.
local REPLACE_EXISTING = false -- Set true only to replace the tracker folders; old copies are backed up.
assert(game ~= nil, "This file installs Roblox components. Use your authorized Roblox Studio Command Bar in Edit mode; the desktop Lua sandbox has no Roblox APIs.")
local RunService = game:GetService("RunService")
assert(RunService:IsStudio() and not RunService:IsRunning(), "Run this installer in Roblox Studio EDIT mode, not Play mode or the desktop Lua sandbox")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local ServerStorage = game:GetService("ServerStorage")
local StarterPlayerScripts = StarterPlayer:FindFirstChildOfClass("StarterPlayerScripts")
assert(StarterPlayerScripts, "StarterPlayerScripts is unavailable")
local destinations = {
 shared = {parent=ReplicatedStorage,name="PlayerTracking"},
 server = {parent=ServerScriptService,name="PlayerTrackingServer"},
 client = {parent=StarterPlayerScripts,name="PlayerTrackingClient"},
}
for _, entry in pairs(destinations) do
 local existing=entry.parent:FindFirstChild(entry.name)
 assert(not existing or REPLACE_EXISTING, "Existing "..entry.name.." found. Preserve your Config viewer IDs, then set REPLACE_EXISTING=true to replace it with a backup.")
 if existing then assert(existing:IsA("Folder"), "Expected tracker Folder, refusing to replace another instance type") end
end
local sources = {
'''
footer = '''
}
local staged={}
local ok,err=pcall(function()
 for key,entry in pairs(destinations) do local folder=Instance.new("Folder");folder.Name=entry.name;staged[key]=folder end
 for _,entry in ipairs(sources) do
  local instance=Instance.new(entry.class)
  instance.Name=entry.name
  instance.Parent=staged[entry.folder]
  instance.Source=entry.source
 end
end)
if not ok then for _,folder in pairs(staged) do folder:Destroy() end;error("Install aborted before modifying your project: "..tostring(err)) end
game:GetService("ChangeHistoryService"):SetWaypoint("Before PlayerTracking install")
local backup=nil
for key,entry in pairs(destinations) do
 local existing=entry.parent:FindFirstChild(entry.name)
 if existing then
  if not backup then backup=Instance.new("Folder");backup.Name="PlayerTrackingBackup_"..game:GetService("HttpService"):GenerateGUID(false);backup.Parent=ServerStorage end
  for _,child in ipairs(existing:GetDescendants()) do if child:IsA("BaseScript") then child:SetAttribute("PlayerTrackingPreviouslyDisabled",child.Disabled);child.Disabled=true end end
  existing.Parent=backup
 end
 staged[key].Parent=entry.parent
end
game:GetService("ChangeHistoryService"):SetWaypoint("PlayerTracking installed")
print("Installed ESP walls, boxes, skeletons, and Q/T/X camera locks. Test with two Studio clients. Before publishing, set ReplicatedStorage.PlayerTracking.Config.AllowedUserIds. HTTP export remains disabled.")
if backup then print("Previous tracker folders are preserved in ServerStorage/"..backup.Name..". Restore viewer IDs and custom settings deliberately; do not enable public tracking unintentionally.") end
'''
OUTPUT.write_text(header + ",\n".join(parts) + footer)
print(f"{OUTPUT} ({len(parts)} embedded Lua sources)")
