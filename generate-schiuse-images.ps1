Add-Type -AssemblyName System.Drawing
$folder = Join-Path $PSScriptRoot 'schiuse-images'
if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder | Out-Null }
$data = @(
    @{ Name = 'baetis.jpeg'; Text = 'Baetis'; Color = '#1D4ED8' }
    @{ Name = 'ephemera.jpeg'; Text = 'Ephemera'; Color = '#0EA5E9' }
    @{ Name = 'trichoptera.jpeg'; Text = 'Trichoptera'; Color = '#14B8A6' }
    @{ Name = 'chironomid.jpeg'; Text = 'Chironomid'; Color = '#F59E0B' }
)
foreach ($item in $data) {
    $bmp = New-Object System.Drawing.Bitmap 420, 260
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromName('Black'))
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml($item.Color)
    $brush = New-Object System.Drawing.SolidBrush $bgColor
    $g.FillRectangle($brush, 20, 20, 380, 220)
    $font = New-Object System.Drawing.Font('Arial', 40, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF 20, 20, 380, 220
    $g.DrawString($item.Text, $font, $textBrush, $rect, $format)
    $output = Join-Path $folder $item.Name
    $bmp.Save($output, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $brush.Dispose()
    $textBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}
Write-Output 'images-created'