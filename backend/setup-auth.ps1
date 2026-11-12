$ErrorActionPreference = 'Stop'
$setupScript = Join-Path $PSScriptRoot 'auth\setup.mjs'
Write-Host 'Create Dash admin authentication tables in MySQL.'
Write-Host 'Enter the MySQL root password you chose during installation. It will not be displayed or saved.'
$databasePassword = Read-Host 'MySQL root password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($databasePassword)
try {
    $passwordText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $passwordText | & node $setupScript
    $setupExitCode = $LASTEXITCODE
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $passwordText = $null
    $databasePassword.Dispose()
}
if ($setupExitCode -eq 0) { Write-Host 'Authentication tables created. Next run npm run auth:mail-setup to connect Microsoft 365.' }
exit $setupExitCode
