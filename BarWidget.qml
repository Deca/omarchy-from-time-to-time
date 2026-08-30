import QtQuick
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.deca.from-time-to-time"

  readonly property var panelItem: panelLoader.item
  readonly property string displayText: panelItem ? panelItem.barText : "TIMELINE"
  readonly property color periodColor: panelItem ? panelItem.activeColor : Color.accent
  readonly property real periodProgress: panelItem ? panelItem.activeProgress : 0

  readonly property bool opened: panelItem ? panelItem.opened === true : false
  readonly property bool popoutSwitchClosing: panelItem ? panelItem.popoutSwitchClosing === true : false

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
  }

  function refresh() {
    if (panelItem && panelItem.refresh) panelItem.refresh()
  }

  function open() {
    if (panelItem) panelItem.open()
  }

  function close() {
    if (panelItem) panelItem.close()
  }

  function togglePanel() {
    if (panelItem) panelItem.toggle()
  }

  function closeForPopoutSwitch() {
    if (panelItem) panelItem.closeForPopoutSwitch()
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  IpcHandler {
    target: "io.github.deca.from-time-to-time"

    function refresh(): void { root.broadcast("refresh") }
    function open(): void { root.open() }
    function close(): void { root.close() }
    function show(): void { root.open() }
    function hide(): void { root.close() }
    function toggle(): void { root.togglePanel() }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.vertical ? (root.panelItem ? root.panelItem.shortLabel : "TIME") : root.displayText
    fontSize: Style.font.bodySmall
    horizontalMargin: 9
    tooltipText: "From Time to Time"

    onPressed: function(mouseButton) {
      if (mouseButton === Qt.MiddleButton) root.refresh()
      else root.togglePanel()
    }

    Rectangle {
      visible: !root.vertical && root.periodProgress > 0
      x: button.scaledHorizontalMargin
      width: Math.max(2, (button.width - button.scaledHorizontalMargin * 2) * root.periodProgress)
      height: Math.max(2, Style.space(2))
      anchors.bottom: parent.bottom
      anchors.bottomMargin: Style.space(5)
      radius: height / 2
      color: root.periodColor
    }
  }
}
