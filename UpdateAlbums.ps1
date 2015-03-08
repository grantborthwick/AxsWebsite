$nl = "`r`n`r`n"
function ReadFile([string]$file){
    $path = (Get-Item -Path ".\" -Verbose).FullName
    return [IO.File]::ReadAllText("$path\$file")
}
function InjectSection([string]$name, [string]$value, [string]$contents){
    $start = "/* Initialize $name */"
    $end = "/* End Initialize $name */"
    $startIndex = $contents.indexOf($start)
    $endIndex = $contents.indexOf($end)
    if (($startIndex -eq -1) -or ($endIndex -eq -1) -or ($endIndex -le $startIndex)){
        throw "($startIndex) $start and ($endIndex) $end not found!"
    }
    return $content.Substring(0, $startIndex + $start.length) + "$value" + $content.Substring($endIndex)
}

$ToNatural = { [regex]::Replace($_, '\d+', { $args[0].Value.PadLeft(20) }) }
$albumPath = "C:\Users\Grant\Google Drive\WebsitePictures"

function albums([string] $path){
    $pictures = ""
    $albumsText = ""
    $name = (Get-Item $path).Name
    $items = Get-ChildItem -Path $path
    $numberedPictures = $true
    $count = 0
    $items | Where-Object {$_ -is [IO.DirectoryInfo]} | Sort-Object Name -descending | ?{
        if ($albumsText.Length -gt 0){
            $albumsText += ","
        }
        $albumsText += albums $_.FullName
    }
    $items | Where-Object {($_ -is [IO.FileInfo]) -and ($_.ToString().IndexOf(".jpg") -ne -1)} | Sort-Object $ToNatural | ?{
        if ($pictures.Length -gt 0){
            $pictures += ","
        }
        $count += 1
        if ($numberedPictures -and ($_.ToString() -ne "$count.jpg")){
            $numberedPictures = $false
            Write-Host $path
            Write-Host "Picture $_  at path does not follow standard: $count.jpg. This album will take up more space."
        }
        $pictures += "'$_'"
    }
    $ret = "{n:'$name'"
    if ($albumsText.Length -gt 0){
        if ($path -eq $albumPath){
            return "$albumsText"
        }
        $ret += ",a:[$albumsText]"
    }
    if ($pictures.Length -gt 0){
        if ($numberedPictures -eq $true){
            $ret += ",p:num($count)"
        } else {
            $ret += ",p:[$pictures]"
        }
    }
    $ret += "}"
    return $ret
}
$albums = albums $albumPath
$today = Get-Date
$today = "new Date('$today');"
try{
    $indexJs = ".\axswebsite\index.js"
    $content = ReadFile $indexJs
    $content = InjectSection "Today" $today $content
    $content = InjectSection "Albums" $albums $content
    #Write-Host $content
    $content | Out-File $indexJs
}
catch {
    Write-Host "Failed to inject :("
    Write-Host $_
}