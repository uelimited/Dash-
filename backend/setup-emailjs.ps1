$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'Connect EmailJS to Dash. These values will be saved only in backend/auth/.env.'
$settings = @{}
$settings.EMAILJS_SERVICE_ID = Read-Host 'EmailJS Service ID'
$settings.EMAILJS_TEMPLATE_ID = Read-Host 'EmailJS Template ID'
$settings.EMAILJS_PUBLIC_KEY = Read-Host 'EmailJS Public Key'
$secret = Read-Host 'EmailJS Private Key (leave empty if not enabled in EmailJS)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $settings.EMAILJS_PRIVATE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $settings | ConvertTo-Json -Compress | & node 'auth/configure-emailjs.mjs'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $settings.Clear()
}
Read-Host 'Press Enter to close'
