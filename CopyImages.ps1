# based on: http://benoitpatra.com/2014/09/14/resize-image-and-preserve-ratio-with-powershell/
function CopyImage([string]$source, [string]$target, [long]$quality){
    if (!(Test-Path $source)){throw( "Cannot find the source image")}
    if(!([System.IO.Path]::IsPathRooted($source))){throw("please enter a full path for your source path")}
    if(!([System.IO.Path]::IsPathRooted($target))){throw("please enter a full path for your target path")}
    if ($quality -lt 0 -or $quality -gt 100){throw( "quality must be between 0 and 100.")}
     
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Drawing")
    $bmp = [System.Drawing.Image]::FromFile($source)
     
    #hardcoded canvas size...
    $canvasWidth = 1024.0
    $canvasHeight = 1024.0
     
    #Encoder parameter for image quality
    $myEncoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($myEncoder, $quality)
    # get codec
    $myImageCodecInfo = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|where {$_.MimeType -eq 'image/jpeg'}
     
    #compute the final ratio to use
    $ratioX = $canvasWidth / $bmp.Width;
    $ratioY = $canvasHeight / $bmp.Height;
    $ratio = $ratioY
    if($ratioX -le $ratioY){
        $ratio = $ratioX
    }
     
    #create resized bitmap
    $newWidth = [int] ($bmp.Width*$ratio)
    $newHeight = [int] ($bmp.Height*$ratio)
    $bmpResized = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    $graph = [System.Drawing.Graphics]::FromImage($bmpResized)
     
    $graph.Clear([System.Drawing.Color]::White)
    $graph.DrawImage($bmp,0,0 , $newWidth, $newHeight)
     
    #save to file
    $bmpResized.Save($target,$myImageCodecInfo, $encoderParams)
    $encoderParams.Dispose()
    $bmpResized.Dispose()
    $bmp.Dispose()
}

$token = "\WebsitePictures"
$albumPath = [Environment]::GetFolderPath("Desktop") + "\..\Google Drive$token"
$pictures = Get-ChildItem $albumPath -recurse -include "*.jpg"
$total = $pictures.Length
$count = 0
Write-Host $skipAlbums
$start = Get-Date
Get-ChildItem $albumPath -recurse | Where-Object {$_ -is [IO.DirectoryInfo]} | %{
    $src = $_.FullName
    $target = (Get-Item -Path ".\" -Verbose).FullName + "\site\images" + ($src.substring($src.indexOf($token) + $token.length) -replace "\\([0-9]{0,2})_","\")
    New-Item -path $target -type directory -force | out-null
}
Get-ChildItem $albumPath -recurse -exclude ("*.jpg", "*.v") | Where-Object {$_ -is [IO.FileInfo]} | %{
    $src = $_.ToString()
    $target = (Get-Item -Path ".\" -Verbose).FullName + "\site\images" + ($src.substring($src.indexOf($token) + $token.length) -replace "\\([0-9]{0,2})_","\")
    Copy-Item -Path $src -Destination $target
}
$pictures | %{
    $src = $_.ToString()
    $target = (Get-Item -Path ".\" -Verbose).FullName + "\site\images" + ($src.substring($src.indexOf($token) + $token.length) -replace "\\([0-9]{0,2})_","\")
    CopyImage $src $target 70
    $count += 1
    if (($count % 10 -eq 0) -or $count -eq $total){
        $now = Get-Date
        Write-Host "$count / $total in" ($now - $start).TotalSeconds "seconds"
    }
}
$end = Get-Date