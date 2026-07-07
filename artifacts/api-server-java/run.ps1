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
    
    # Parse DATABASE_URL if present to set SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, and SPRING_DATASOURCE_PASSWORD
    $dbUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
    if ($dbUrl -and $dbUrl.StartsWith("mysql://")) {
        if ($dbUrl -match "mysql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)") {
            $user = $Matches[1]
            $pass = $Matches[2]
            $host = $Matches[3]
            $port = $Matches[4]
            $dbName = $Matches[5]
            
            # URL decode user and password if they contain encoded characters (like %40 or %24)
            $user = [System.Uri]::UnescapeDataString($user)
            $pass = [System.Uri]::UnescapeDataString($pass)
            
            if (-not $port) { $port = "3306" }
            
            $jdbcUrl = "jdbc:mysql://$host:$port/$dbName?createDatabaseIfNotExist=true&allowPublicKeyRetrieval=true&useSSL=false"
            
            [System.Environment]::SetEnvironmentVariable("SPRING_DATASOURCE_URL", $jdbcUrl, "Process")
            [System.Environment]::SetEnvironmentVariable("SPRING_DATASOURCE_USERNAME", $user, "Process")
            [System.Environment]::SetEnvironmentVariable("SPRING_DATASOURCE_PASSWORD", $pass, "Process")
            
            Write-Host "Auto-configured Spring Datasource from DATABASE_URL:"
            Write-Host "  URL: jdbc:mysql://$host:$port/$dbName"
            Write-Host "  Username: $user"
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
