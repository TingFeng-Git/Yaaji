// Chrome Extension Service Worker
// 处理右键菜单、消息通信等功能

// 安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('雅集书签管理插件已安装')
    // 可以在这里初始化默认数据
  }
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'addBookmark',
    title: '添加到雅集书签',
    contexts: ['page', 'link'],
    documentUrlPatterns: ['<all_urls>']
  })
})

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addBookmark') {
    const url = info.linkUrl || tab.url
    const title = tab.title || '未命名页面'
    
    // 打开 popup 并传递数据
    chrome.storage.local.set({
      'pendingBookmark': {
        url: url,
        title: title,
        timestamp: Date.now()
      }
    })
    
    // 打开扩展的 popup
    chrome.action.openPopup()
  }
})

// 处理消息通信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageTitle') {
    fetch(request.url, { mode: 'cors' })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok')
        return response.text()
      })
      .then(html => {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const title = titleMatch ? titleMatch[1].trim() : ''
        sendResponse({ title })
      })
      .catch(() => {
        sendResponse({ title: '' })
      })
    return true
  }

  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage()
    sendResponse({ success: true })
    return true
  }
})

// 监听存储变化（用于跨页面同步）
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // 数据变化时的处理逻辑
    console.log('Storage changed:', changes)
  }
})
