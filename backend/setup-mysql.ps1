$ErrorActionPreference = 'Stop'
$setupScript = Join-Path $PSScriptRoot 'mysql\setup.mjs'
Write-Host 'Connect Dash to your local MySQL server.'
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
if ($setupExitCode -eq 0) { Write-Host 'Return to Dash to finish moving your records.' }
exit $setupExitCode
