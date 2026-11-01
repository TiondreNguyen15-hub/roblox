param([long]$WindowHandle)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class BlueWindow {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
 [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@
[BlueWindow]::SetProcessDPIAware() | Out-Null
$handleValue = [IntPtr]$WindowHandle
while ([BlueWindow]::IsWindow($handleValue)) {
 $rect = New-Object BlueWindow+RECT
 $result = [BlueWindow]::DwmGetWindowAttribute($handleValue, 9, [ref]$rect, 16)
 if ($result -ne 0) { [BlueWindow]::GetWindowRect($handleValue, [ref]$rect) | Out-Null }
 @{x=$rect.Left;y=$rect.Top;width=($rect.Right-$rect.Left);height=($rect.Bottom-$rect.Top);visible=(![BlueWindow]::IsIconic($handleValue) -and [BlueWindow]::GetForegroundWindow() -eq $handleValue)} | ConvertTo-Json -Compress | Write-Output
 Start-Sleep -Milliseconds 120
}
