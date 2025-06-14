$largeModels = @(
    "space_station_3.glb",
    "information_singularity.glb", 
    "dyson_rings.glb",
    "strangest_star.glb",
    "stranger_star.glb"
)

foreach ($model in $largeModels) {
    $inputPath = "public/models/$model"
    $outputPath = "public/models/" + $model.Replace(".glb", "_optimized.glb")
    gltf-pipeline -i $inputPath -o $outputPath --draco.compressionLevel 10
    Write-Output "Optimized $model → $outputPath"
}
