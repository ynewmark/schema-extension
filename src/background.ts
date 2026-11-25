console.log(
  '[From the background context] Hello from the background worker/script!'
)

// Named one by one so the bundler can fold each build down to a single
// branch. waterfox and librewolf are gecko, and used to fall to chromium.
const isFirefoxLike =
  import.meta.env.EXTENSION_PUBLIC_BROWSER === 'firefox' ||
  import.meta.env.EXTENSION_PUBLIC_BROWSER === 'waterfox' ||
  import.meta.env.EXTENSION_PUBLIC_BROWSER === 'librewolf' ||
  import.meta.env.EXTENSION_PUBLIC_BROWSER === 'gecko-based'

const isSafariLike =
  import.meta.env.EXTENSION_PUBLIC_BROWSER === 'safari' ||
  import.meta.env.EXTENSION_PUBLIC_BROWSER === 'webkit-based'

// Safari has no side panel surface, so the sidebar page opens in a tab.
let sidebarTabId: number | undefined

function openSidebarTab() {
  const url = chrome.runtime.getURL('sidebar/index.html')

  const openNewTab = () => {
    chrome.tabs.create({url}, (tab) => {
      sidebarTabId = tab?.id
    })
  }

  // A repeat click focuses the tab already opened instead of a new copy.
  const knownTabId = sidebarTabId

  if (knownTabId === undefined) {
    openNewTab()

    return
  }

  chrome.tabs.update(knownTabId, {active: true}, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      openNewTab()

      return
    }

    // Selecting a tab in another window leaves that window behind the one the
    // user is looking at, so raise it too.
    chrome.windows?.update(tab.windowId, {focused: true})
  })
}

if (isFirefoxLike) {
  // Firefox refuses sidebarAction.open() outside a user input handler, and a
  // message listener is not one, so the toolbar click is the only route.
  browser.browserAction.onClicked.addListener((tab) => {
    void browser.sidebarAction.open().catch((cause) => {
      console.error('Unable to open the Schema Explorer sidebar.', cause)
    })

    if (tab.id === undefined) return

    void browser.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => ({
        html: document.documentElement.outerHTML,
        url: location.href
      })
    }).then((results) => {
      const result = results[0]?.result
      return browser.storage.session.set({
        tabData: result ?? {error: 'Unable to fetch schema information.'}
      })
    }).catch((cause) => {
      console.error('Unable to fetch schema information.', cause)
      return browser.storage.session.set({
        tabData: {
          error: cause instanceof Error
            ? cause.message
            : 'Unable to fetch schema information.'
        }
      })
    }).catch((cause) => {
      console.error('Unable to save page data for the sidebar.', cause)
    })
  })
}

if (isSafariLike) {
  // Safari never had setPanelBehavior, so the toolbar click needs a listener.
  chrome.action?.onClicked.addListener(() => {
    openSidebarTab()
  })

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== 'openSidebar') return

    openSidebarTab()
  })
}

if (!isFirefoxLike && !isSafariLike) {
  // Override panel-on-click behavior left by previous versions so the action
  // click handler can capture the page before opening the panel.
  chrome.sidePanel?.setPanelBehavior({openPanelOnActionClick: false}).catch((cause) => {
    console.error('Unable to configure the Schema Explorer side panel.', cause)
  })

  chrome.action?.onClicked.addListener((tab) => {
    if (tab.id === undefined) return

    void chrome.storage.session.set({panelTabId: tab.id})

    // Start the injection directly in the action-click handler, before
    // opening the panel or awaiting any other extension API.
    const capture = chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        html: document.documentElement.outerHTML,
        url: location.href
      })
    })

    const openPanel = chrome.sidePanel?.open({tabId: tab.id})
    void openPanel?.catch((cause) => {
      console.error('Unable to open the Schema Explorer side panel.', cause)
    })

    void capture.then(async (results) => {
      const result = results[0]?.result
      if (result) {
        await chrome.storage.session.set({tabData: result})
      } else {
        await chrome.storage.session.set({
          tabData: {error: 'Unable to fetch schema information.'}
        })
      }
    }).catch(async (cause) => {
      await chrome.storage.session.set({
        tabData: {
          error: cause instanceof Error
            ? cause.message
            : 'Unable to fetch schema information.'
        }
      })
    })
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'loading' || !tab.active) return

    void (async () => {
      await chrome.storage.session.remove('tabData')
      const sidePanel = chrome.sidePanel as typeof chrome.sidePanel & {
        close?: (options: {tabId?: number; windowId?: number}) => Promise<void>
      }

      if (typeof sidePanel.close !== 'function') {
        console.warn('Closing the side panel requires Chrome 141 or newer.')
        return
      }

      try {
        await sidePanel.close({tabId})
      } catch {
        // A global panel rejects tabId, so retry using its window.
        await sidePanel.close({windowId: tab.windowId})
      }
    })().catch((cause) => {
      console.error('Unable to close the side panel after tab navigation.', cause)
    })
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void chrome.storage.session.get('panelTabId').then(({panelTabId}) => {
      if (panelTabId !== tabId) return
      return chrome.storage.session.remove(['panelTabId', 'tabData'])
    }).catch((cause) => {
      console.error('Unable to clear data for the closed tab.', cause)
    })
  })
}
