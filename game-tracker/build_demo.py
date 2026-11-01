"""Build a source ZIP and a Roblox XML demo place without changing source files."""
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / "downloads"
OUTPUT.mkdir(exist_ok=True)
document = ET.Element("roblox", {"version": "4"})
counter = 0


def item(parent, class_name, name):
    global counter
    counter += 1
    node = ET.SubElement(parent, "Item", {"class": class_name, "referent": f"RBX{counter}"})
    properties = ET.SubElement(node, "Properties")
    ET.SubElement(properties, "string", {"name": "Name"}).text = name
    return node, properties


def source_folder(parent, name, directory):
    folder, _ = item(parent, "Folder", name)
    for path in sorted(directory.glob("*.lua")):
        suffix = ".server.lua" if path.name.endswith(".server.lua") else ".client.lua" if path.name.endswith(".client.lua") else ".lua"
        class_name = {".server.lua": "Script", ".client.lua": "LocalScript", ".lua": "ModuleScript"}[suffix]
        _, properties = item(folder, class_name, path.name[:-len(suffix)])
        ET.SubElement(properties, "ProtectedString", {"name": "Source"}).text = path.read_text()
    return folder


replicated, _ = item(document, "ReplicatedStorage", "ReplicatedStorage")
source_folder(replicated, "PlayerTracking", ROOT / "shared")
server, _ = item(document, "ServerScriptService", "ServerScriptService")
source_folder(server, "PlayerTrackingServer", ROOT / "server")
starter, _ = item(document, "StarterPlayer", "StarterPlayer")
scripts, _ = item(starter, "StarterPlayerScripts", "StarterPlayerScripts")
source_folder(scripts, "PlayerTrackingClient", ROOT / "client")
workspace, _ = item(document, "Workspace", "Workspace")
for class_name, name, y, dimensions, color in [
    ("Part", "DemoFloor", 0, (256, 1, 256), 0x1A2638),
    ("SpawnLocation", "Spawn", 3, (8, 1, 8), 0x2788FF),
]:
    _, properties = item(workspace, class_name, name)
    ET.SubElement(properties, "bool", {"name": "Anchored"}).text = "true"
    ET.SubElement(properties, "Color3uint8", {"name": "Color3uint8"}).text = str(color)
    size = ET.SubElement(properties, "Vector3", {"name": "size"})
    for axis, value in zip("XYZ", dimensions):
        ET.SubElement(size, axis).text = str(value)
    cf = ET.SubElement(properties, "CoordinateFrame", {"name": "CFrame"})
    for axis, value in zip("XYZ", (0, y, 0)):
        ET.SubElement(cf, axis).text = str(value)
    for row in range(3):
        for column in range(3):
            ET.SubElement(cf, f"R{row}{column}").text = str(int(row == column))

place = OUTPUT / "Player-Tracking-Demo.rbxlx"
ET.ElementTree(document).write(place, encoding="utf-8", xml_declaration=True)
assert len(document.findall(".//ProtectedString[@name='Source']")) == sum(len(list((ROOT / folder).glob('*.lua'))) for folder in ('shared','server','client'))
ET.parse(place)
with ZipFile(OUTPUT / "Player-Tracking-Source.zip", "w", ZIP_DEFLATED) as archive:
    for path in sorted(ROOT.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts:
            archive.write(path, "game-tracker/" + str(path.relative_to(ROOT)))
print(place)
print(OUTPUT / "Player-Tracking-Source.zip")
