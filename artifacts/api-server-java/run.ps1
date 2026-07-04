$mavenVersion = "3.9.6"
$mavenDir = "$PSScriptRoot\.maven"
$mavenZip = "$PSScriptRoot\maven.zip"

# Load environment variables from root .env file if it exists
$envPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.env"))
if (Test-Path $envPath) {
    Write-Host "Loading environment variables from $envPath..."
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim().Trim('"').Trim("'")
                [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
} else {
    Write-Host "No .env file found at $envPath"
}

if (-not (Test-Path "$mavenDir\apache-maven-$mavenVersion")) {
    Write-Host "Downloading Maven $mavenVersion..."
    $url = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
    Invoke-WebRequest -Uri $url -OutFile $mavenZip
    
    Write-Host "Extracting Maven..."
    Expand-Archive -Path $mavenZip -DestinationPath $mavenDir
    Remove-Item $mavenZip
}

$mvn = "$mavenDir\apache-maven-$mavenVersion\bin\mvn.cmd"
Write-Host "Running Spring Boot Application..."
& $mvn -f "$PSScriptRoot\pom.xml" spring-boot:run
