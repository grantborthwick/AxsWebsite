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
    return $content.Substring(0, $startIndex + $start.length) + "$value" + $content.Substring($endIndex)
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

$officers = Import-Csv .\officers.csv
$members = Import-Csv .\members.csv
$faq = Import-Csv .\faq.csv
$officersText = ""
$membersText = ""
$faqText = ""
$officers | ForEach-Object {
    $position = $_.position
    $name = $_.name
    $email = $_.email
    $picture = $_.picture
    $classification = $_.classification
    $major = $_.major
    $parameters = "'$position','$name','$email'"
    if ($picture -or $classification -or $major){
        $parameters += ",'$picture'"
    }
    if ($classification -or $major){
        $parameters += ",'$classification'"
    }
    if ($major){
        $parameters += ",'$major'"
    }
    $officersText += "a($parameters),"
}
$members | ForEach-Object {
    $id = $_.id
    $name = $_.name
    $initiationDate = $_.initiationDate
    $status = $_.status
    $family = $_.family
    $big = $_.big
    $chapter = $_.chapter
    $parameters = "'$id','$name','$initiationDate','$status'"
    if ($family -or $big -or $chapter){
        $parameters += ",'$family'"
    }
    if ($big -or $chapter){
        $parameters += ",'$big'"
    }
    if ($chapter){
        $parameters += ",'$chapter'"
    }
    $membersText += "a($parameters),"
}
$faq | ForEach-Object {
    $question = ($_.question -replace "'", "\'") -replace '"', '\"'
    $answer = ($_.answer -replace "'", "\'") -replace '"', '\"'
    $parameters = "'$question','$answer'"
    $faqText += "a($parameters),"
}
$officersText = "var a=function(position,name,email,picture,classification,major){return new Officer(position,name,email,picture,classification,major);};viewModel.officerList.push(" + $officersText.Substring(0, $officersText.Length - 1) + ");"
$membersText = "var a=function(id,name,date,status,family,big,chapter){return new Member(id,name,date,status,family,big,chapter);};viewModel.memberList.push(" + $membersText.Substring(0, $membersText.Length - 1) + ");"
$faqText = "var a=function(question,answer){return new Faq(question,answer);};viewModel.faqList.push(" + $faqText.Substring(0, $faqText.Length - 1) + ");"
if ($updateAlbums){
    $albums = albums $albumPath
} else {
    Write-Host "Skipping albums. $albumPath does not exist."
}
$today = Get-Date
$today = "new Date('$today');"
try{
    $indexJs = ".\site\index.js"
    $content = ReadFile $indexJs
    $content = InjectSection "Officers" $officersText $content
    $content = InjectSection "Members" $membersText $content
    $content = InjectSection "Faq" $faqText $content
    if ($updateAlbums){
        $content = InjectSection "Albums" $albums $content
    }
    $content = InjectSection "Today" $today $content
    
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