$start = Get-Date
$nl = "`r`n`r`n"
$ToNatural = { [regex]::Replace($_, '\d+', { $args[0].Value.PadLeft(20) }) }
$albumPath = [Environment]::GetFolderPath("User") + "\Google Drive\WebsitePictures\albums"
$currentPath = (Get-Item -Path ".\" -Verbose).FullName
function ReadFile([string]$file){
    if (Test-Path $file){
        try {
            return [IO.File]::ReadAllText("$file")
        }
        catch { }
        return [IO.File]::ReadAllText("$currentPath\$file")
    } else {
        throw "$file does not exist"
    }
}
function InjectSection([string]$name, [string]$value, [string]$contents){
    $start = "/* Initialize $name */"
    $end = "/* End Initialize $name */"
    $startIndex = $contents.indexOf($start)
    $endIndex = $contents.indexOf($end)
    if (($startIndex -eq -1) -or ($endIndex -eq -1) -or ($endIndex -le $startIndex)){
        throw "($startIndex) $start and ($endIndex) $end not found!"
    }
    return $content.Substring(0, $startIndex + $start.length) + "`r`n$value`r`n" + $content.Substring($endIndex)
}
function albums([string] $path){
    $pictures = ""
    $otherPictures = ""
    $albumsText = ""
    $name = (Get-Item $path).Name -replace "([0-9]{0,2})_",""
    $items = Get-ChildItem -Path $path
    $numberedPictures = $true
    $count = 0
    if ($path -eq $albumPath){
        $directoryItems = $items | Where-Object {$_ -is [IO.DirectoryInfo]} | Sort-Object Name -descending
    } else {
        $directoryItems = $items | Where-Object {$_ -is [IO.DirectoryInfo]} | Sort-Object Name
    }
    $directoryItems | ? {
        if ($albumsText.Length -gt 0){
            $albumsText += ","
        }
        $albumsText += albums $_.FullName
    }
    $items | Where-Object {($_ -is [IO.FileInfo]) -and ($_.ToString().IndexOf(".v") -ne -1)} | Sort-Object $ToNatural | ? {
        if ($otherPictures.Length -gt 0){
            $otherPictures += ","
        }
        $v = ReadFile $_.FullName
        $otherPictures += "new AlbumVideo('$v')"
    }
    $items | Where-Object {($_ -is [IO.FileInfo]) -and ($_.ToString().IndexOf(".jpg") -eq -1)-and ($_.ToString().IndexOf(".v") -eq -1)} | Sort-Object $ToNatural | ? {
        if ($otherPictures.Length -gt 0){
            $otherPictures += ","
        }
        $otherPictures += "'$_'"
    }
    $items | Where-Object {($_ -is [IO.FileInfo]) -and ($_.ToString().IndexOf(".jpg") -ne -1)} | Sort-Object $ToNatural | ? {
        if ($pictures.Length -gt 0){
            $pictures += ","
        }
        $count += 1
        if ($numberedPictures -and ($_.ToString() -ne "$count.jpg")){
            $numberedPictures = $false
            $partialPath = $path.substring($path.indexOf("albums\") + 7)
            Write-Host "'$partialPath\$_' -ne '$count.jpg'."
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
    if (($pictures.Length -gt 0) -or ($otherPictures.Length -gt 0)){
        if ($numberedPictures -eq $true){
            $ret += ",p:unshift(num($count)"
        } else {
            $ret += ",p:unshift([$pictures]"
        }
        if ($otherPictures.Length -gt 0){
            $ret += ",$otherPictures"
        }
        $ret += ")"
    }
    $ret += "}"
    return $ret
}

$updateAlbums = Test-Path $albumPath

$officersText = [string]::Join(
    ",`r`n",
    (Import-Csv .\officers.csv | ForEach-Object {
        "new Officer('$($_.position)', '$($_.name)', '$($_.email)', '$(if ($_.picture) { $_.picture } else { "images/officers/no photo" })', '$($_.pronoun)', '$($_.objectivePronoun)', '$($_.classification)', '$($_.major)', '$($_.minor)')"
    }))
$faqText = [string]::Join(
    ",`r`n",
    (Import-Csv .\faq.csv | ForEach-Object {
        $question = ($_.question -replace "'", "\'") -replace '"', '\"'
        $answer = ($_.answer -replace "'", "\'") -replace '"', '\"'
        "new Faq('$question', '$answer')"
    }))

if ($updateAlbums){
    $albums = albums $albumPath
} else {
    Write-Host "Skipping albums. $albumPath does not exist."
}

# Inject Generated JavaScript
try {
    $indexJs = ".\site\index.js"
    $content = ReadFile $indexJs
    $content = InjectSection "Officers" $officersText $content
    $content = InjectSection "Faq" $faqText $content
    if ($updateAlbums){
        $content = InjectSection "Albums" $albums $content
    }
    $content = InjectSection "Today" "'$((Get-Date).ToUniversalTime())Z'" $content
    $content = InjectSection "Git Origin" "'$(git config --get remote.origin.url)'" $content
    $content = InjectSection "Git Branch" "'$(git rev-parse --abbrev-ref HEAD)'" $content
    $content = InjectSection "Git Commit" "'$(git rev-parse HEAD)'" $content
    $content = InjectSection "Git Commit Date" "'$(git show -s --format=%ci HEAD)'" $content
    $content = InjectSection "Git Master Commit" "'$(git rev-parse master)'" $content
    $content = InjectSection "Git Master Commit Date" "'$(git show -s --format=%ci master)'" $content
    
    $diff = git diff origin/master --stat;
    if ($diff.Length -ne 0) {
        Write-Warning "Uncomitted changes! You need to commit your changes to master and push to the remote repo!"
        git diff --stat
    }
    
    # Out-File doesn't allow us to write the file as Utf8
    $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
    [System.IO.File]::WriteAllText($indexJs, $content, $Utf8NoBomEncoding)
}
catch {
    Write-Host "Failed to inject :("
    Write-Host $_
}
$end = Get-Date
Write-Host "Updated in" ($end - $start).TotalSeconds "seconds"