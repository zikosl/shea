#define AppName "Shea Local Gateway"
#define AppVersion "1.0.0"
#define AppPublisher "Shea"

[Setup]
AppId={{3DA29F4A-EA7B-4A51-AB69-815F11A9F4CB}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\Shea Local Gateway
DefaultGroupName=Shea
OutputDir=output
OutputBaseFilename=Shea-Local-Gateway-{#AppVersion}-x64
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#AppName}

[Dirs]
Name: "{commonappdata}\Shea\Local Gateway"; Permissions: admins-full system-full

[Files]
Source: "..\stage\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\.env.example"; DestDir: "{commonappdata}\Shea\Local Gateway"; DestName: "gateway.env.example"; Flags: onlyifdoesntexist

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\configure.ps1"""; Description: "Configure PostgreSQL and connect this store"; Flags: postinstall waituntilterminated skipifsilent

[UninstallRun]
Filename: "{app}\runtime\node.exe"; Parameters: """{app}\dist\windows-service.js"" remove"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated; RunOnceId: "RemoveGatewayService"

[Icons]
Name: "{group}\Gateway configuration folder"; Filename: "{sys}\explorer.exe"; Parameters: """{commonappdata}\Shea\Local Gateway"""
Name: "{group}\Configure Shea Local Gateway"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\configure.ps1"""
