$models = @(
    "space_station_3.glb",
    "information_singularity.glb",
    "dyson_rings.glb",
    "strangest_star.glb"
)

foreach ($model in $models) {
    $inputPath = "public/models/$model"
    $outputPath = "public/models/" + $model.Replace(".glb", "_low.glb")
    gltf-pipeline -i $inputPath -o $outputPath --draco.compressionLevel 5
    Write-Output "Created LOD version: $outputPath"
}
