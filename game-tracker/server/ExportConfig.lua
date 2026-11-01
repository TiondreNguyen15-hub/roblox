-- Server only. Never put a publisher credential in ReplicatedStorage or a LocalScript.
return {
	Enabled = false, -- Enable after deploying the HTTPS relay and setting its secret.
	RelayUrl = "", -- Example: https://player-data.example.com
	SecretName = "PLAYER_DATA_PUBLISH_TOKEN", -- Creator Hub secret, restricted to your relay domain.
	PublishHz = 2, -- One batched HTTP request per server tick, not per player.
	MaxViewers = 10,
}
