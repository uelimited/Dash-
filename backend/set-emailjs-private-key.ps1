$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$Host.UI.RawUI.WindowTitle = 'Dash - EmailJS Private Key'
Write-Host 'Copy your EmailJS Private Key from Account settings. Enter it below; it will not be displayed.'
$key = Read-Host 'EmailJS Private Key' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
try {
  [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) | & node 'auth/configure-private-key.mjs'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $key.Dispose()
}
Read-Host 'Press Enter to close'
