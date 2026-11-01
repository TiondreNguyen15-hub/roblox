local Store = {}
Store.__index = Store
function Store.new(config)
	return setmetatable({config = config, history = {}, sequence = 0}, Store)
end
function Store:Push(packet)
	if packet.sequence <= self.sequence then return end
	self.sequence = packet.sequence
	local present = {}
	for _, entity in ipairs(packet.entities) do
		present[entity.id] = true
		local history = self.history[entity.id]
		if not history or history.generation ~= entity.generation then
			history = {generation = entity.generation, samples = {}}
			self.history[entity.id] = history
		end
		table.insert(history.samples, {time = packet.time, entity = entity})
		while #history.samples > 8 do table.remove(history.samples, 1) end
	end
	for id in pairs(self.history) do if not present[id] then self.history[id] = nil end end
end
function Store:Get(now)
	local result = {}
	local target = now - self.config.InterpolationDelay
	for _, history in pairs(self.history) do
		local samples = history.samples
		local newest = samples[#samples]
		if now - newest.time <= self.config.StaleAfter then
			local left, right = samples[1], newest
			for index = 1, #samples - 1 do
				if target >= samples[index].time and target <= samples[index + 1].time then
					left, right = samples[index], samples[index + 1]
					break
				end
			end
			if target >= newest.time then left, right = newest, newest end
			if target <= samples[1].time then left, right = samples[1], samples[1] end
			local alpha = right.time > left.time and math.clamp((target - left.time) / (right.time - left.time), 0, 1) or 1
			local entity = table.clone(right.entity)
			entity.root = left.entity.root:Lerp(right.entity.root, alpha)
			entity.joints = {}
			for name, position in pairs(right.entity.joints) do
				entity.joints[name] = (left.entity.joints[name] or position):Lerp(position, alpha)
			end
			table.insert(result, entity)
		end
	end
	return result
end
return Store
