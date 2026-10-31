-- Load the read-only map feed when BeamNG mounts this companion.
-- The vehicle protocol also loads it, covering an already-spawned vehicle.
setExtensionUnloadMode('drivedeck_map', 'manual')
if not extensions.drivedeck_map then extensions.load('drivedeck_map') end
