!include "MUI2.nsh"

Var CreateDesktopShortcut
Var CreateStartMenuShortcut

!define MUI_PAGE_CUSTOMFUNCTION_PRE TasksPagePre
!insertmacro MUI_PAGE_COMPONENTS

Function TasksPagePre
  ; Default both options to enabled
  StrCpy $CreateDesktopShortcut 1
  StrCpy $CreateStartMenuShortcut 1
FunctionEnd

Section "Desktop shortcut" DesktopShortcutSection
  SectionIn RO
  StrCpy $CreateDesktopShortcut 1
SectionEnd

Section "Start Menu shortcut" StartMenuShortcutSection
  SectionIn RO
  StrCpy $CreateStartMenuShortcut 1
SectionEnd

!macro customInstall
  ${If} $CreateDesktopShortcut == 1
    CreateShortCut "$DESKTOP\MoR LMS.lnk" "$INSTDIR\MoR LMS.exe"
  ${EndIf}

  ${If} $CreateStartMenuShortcut == 1
    CreateDirectory "$SMPROGRAMS\MoR LMS"
    CreateShortCut "$SMPROGRAMS\MoR LMS\MoR LMS.lnk" "$INSTDIR\MoR LMS.exe"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\MoR LMS.lnk"
  Delete "$SMPROGRAMS\MoR LMS\MoR LMS.lnk"
  RMDir "$SMPROGRAMS\MoR LMS"
!macroend